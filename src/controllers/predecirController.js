const { ObjectId } = require('mongodb');
const { connectMongo } = require('../config/mongo');
const { runPythonForecast } = require('../services/predict.service');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python';
const MODEL_PATH = process.env.MODEL_PATH || 'prophet_maconst_v1.json';
const PY_SCRIPT  = process.env.PY_SCRIPT  || 'python/predict_from_model.py';

function resolveIdFilter(raw) {
  const rawId = String(raw || '').trim();
  let asObjId = null;
  try { asObjId = new ObjectId(rawId); } catch {/* no es válido */}
  return { rawId, asObjId };
}

function normalizePythonResult(pyRes) {
  if (Array.isArray(pyRes)) {
    return { data: pyRes, last_ds: undefined, periods_used: undefined };
  }
  if (pyRes && typeof pyRes === 'object') {
    if (pyRes.error) {
      const msg = pyRes.message || 'Error al generar predicciones';
      const err = new Error(msg);
      err.code = 400;
      throw err;
    }
    return {
      data: Array.isArray(pyRes.data) ? pyRes.data : [],
      last_ds: pyRes.last_ds,
      periods_used: pyRes.periods_used
    };
  }
  return { data: [], last_ds: undefined, periods_used: undefined };
}

function mapToES(list) {
  return list.map(p => ({
    fecha: new Date(p.ds),
    pronostico: p.yhat,
    limite_inferior: p.yhat_lower,
    limite_superior: p.yhat_upper
  }));
}

exports.crearPronostico = async (req, res) => {
  try {
    const {
      nombre = 'Pronóstico',
      periodos,
      desde,
      hasta,
      frecuencia = 'MS',
      regresores = [],
      notas,
      rutaModelo
    } = req.body || {};

    if (process.env.DEBUG_PREDECIR === '1') {
      console.log('[predecir:create] args:', { nombre, periodos, desde, hasta, frecuencia, regresores, rutaModelo });
    }

    const pyRes = await runPythonForecast({
      pythonBin: PYTHON_BIN,
      scriptPath: PY_SCRIPT,
      modelPath: rutaModelo || MODEL_PATH,
      freq: frecuencia,
      periods: periodos,
      from: desde,
      until: hasta,
      regressors: regresores,
    });

    const { data, last_ds, periods_used } = normalizePythonResult(pyRes);

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        mensaje: 'No se generaron nuevas predicciones.',
        detalle: last_ds
          ? `Asegúrate de que "hasta" sea posterior a ${last_ds} o especifica "periodos".`
          : 'Verifica los parámetros enviados.'
      });
    }

    const db = await connectMongo();
    const doc = {
      nombre,
      rutaModelo: rutaModelo || MODEL_PATH,
      frecuencia,
      desde: desde ? new Date(desde) : null,
      hasta: hasta ? new Date(hasta) : null,
      periodos: typeof periodos === 'number' ? periodos : (typeof periods_used === 'number' ? periods_used : null),
      regresores,
      predicciones: mapToES(data),
      notas: notas || null,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
      metaModelo: { ultimaFechaModelo: last_ds || null }
    };

    const r = await db.collection('pronosticos').insertOne(doc);
    res.status(201).json({ _id: r.insertedId, ...doc });
  } catch (err) {
    const code = err.code && Number.isFinite(err.code) ? err.code : 500;
    if (process.env.DEBUG_PREDECIR === '1') console.error('[predecir:create] error:', err);
    res.status(code).json({
      mensaje: code === 400 ? 'Parámetros inválidos para generar nuevas predicciones.' : 'No se pudo crear el pronóstico',
      detalle: String(err.message || err)
    });
  }
};

exports.listarPronosticos = async (req, res) => {
  try {
    const db = await connectMongo();
    const { desde, hasta } = req.query;
    const q = {};

    if (desde && hasta) {
      q.$or = [
        { desde: { $gte: new Date(desde), $lte: new Date(hasta) } },
        { hasta: { $gte: new Date(desde), $lte: new Date(hasta) } }
      ];
    } else if (desde) {
      q.desde = { $gte: new Date(desde) };
    } else if (hasta) {
      q.hasta = { $lte: new Date(hasta) };
    }

    const docs = await db.collection('pronosticos')
      .find(q)
      .sort({ creadoEn: -1 })
      .limit(200)
      .toArray();

    res.json(docs);
  } catch (err) {
    res.status(500).json({ mensaje: 'No se pudo listar', detalle: String(err.message || err) });
  }
};

exports.obtenerPronostico = async (req, res) => {
  try {
    const db = await connectMongo();
    const { rawId, asObjId } = resolveIdFilter(req.params.id);

    let doc = null;
    if (asObjId) doc = await db.collection('pronosticos').findOne({ _id: asObjId });
    if (!doc)   doc = await db.collection('pronosticos').findOne({ _id: rawId });

    if (!doc) return res.status(404).json({ mensaje: 'No encontrado' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener', detalle: String(err.message || err) });
  }
};

exports.actualizarPronostico = async (req, res) => {
  try {
    const db = await connectMongo();
    const { rawId, asObjId } = resolveIdFilter(req.params.id);
    const { nombre, notas, regenerar } = req.body || {};

    const upd = { actualizadoEn: new Date() };
    if (nombre !== undefined) upd.nombre = nombre;
    if (notas !== undefined)  upd.notas  = notas;

    let docOrig = null;
    if (asObjId) docOrig = await db.collection('pronosticos').findOne({ _id: asObjId });
    if (!docOrig) docOrig = await db.collection('pronosticos').findOne({ _id: rawId });
    if (!docOrig) return res.status(404).json({ mensaje: 'No encontrado' });

    if (regenerar) {
      const pyRes = await runPythonForecast({
        pythonBin: PYTHON_BIN,
        scriptPath: PY_SCRIPT,
        modelPath: docOrig.rutaModelo,
        freq: regenerar.frecuencia || docOrig.frecuencia,
        periods: (regenerar.periodos ?? docOrig.periodos),
        from: regenerar.desde || (docOrig.desde ? docOrig.desde.toISOString().slice(0,10) : undefined),
        until: regenerar.hasta || (docOrig.hasta ? docOrig.hasta.toISOString().slice(0,10) : undefined),
        regressors: regenerar.regresores || docOrig.regresores || [],
      });

      const { data, last_ds, periods_used } = normalizePythonResult(pyRes);

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          mensaje: 'No se generaron nuevas predicciones.',
          detalle: last_ds
            ? `Asegúrate de que "hasta" sea posterior a ${last_ds} o especifica "periodos".`
            : 'Verifica los parámetros enviados.'
        });
      }

      upd.frecuencia = regenerar.frecuencia || docOrig.frecuencia;
      upd.desde = regenerar.desde ? new Date(regenerar.desde) : (docOrig.desde || null);
      upd.hasta = regenerar.hasta ? new Date(regenerar.hasta) : (docOrig.hasta || null);
      upd.periodos = typeof regenerar.periodos === 'number'
        ? regenerar.periodos
        : (typeof periods_used === 'number' ? periods_used : (docOrig.periodos || null));
      upd.regresores = regenerar.regresores || docOrig.regresores || [];
      upd.predicciones = mapToES(data);
      upd.metaModelo = { ultimaFechaModelo: last_ds || (docOrig.metaModelo?.ultimaFechaModelo || null) };
    }

    const filter = (docOrig._id instanceof ObjectId)
      ? { _id: docOrig._id }
      : { _id: String(docOrig._id) };

    const r = await db.collection('pronosticos').findOneAndUpdate(
      filter,
      { $set: upd },
      { returnDocument: 'after' }
    );
    if (!r.value) return res.status(404).json({ mensaje: 'No encontrado' });

    res.json(r.value);
  } catch (err) {
    const code = err.code && Number.isFinite(err.code) ? err.code : 500;
    res.status(code).json({
      mensaje: code === 400 ? 'Parámetros inválidos para regenerar.' : 'No se pudo actualizar',
      detalle: String(err.message || err)
    });
  }
};

exports.eliminarPronostico = async (req, res) => {
  try {
    const db = await connectMongo();
    const { rawId, asObjId } = resolveIdFilter(req.params.id);

    let r = { deletedCount: 0 };
    if (asObjId) r = await db.collection('pronosticos').deleteOne({ _id: asObjId });
    if (!r.deletedCount) r = await db.collection('pronosticos').deleteOne({ _id: rawId });

    if (!r.deletedCount) return res.status(404).json({ mensaje: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ mensaje: 'No se pudo eliminar', detalle: String(err.message || err) });
  }
};