const { spawn } = require('child_process');

function runPythonForecast({ pythonBin, scriptPath, modelPath, freq='MS', periods, from, until, regressors=[] }) {
  return new Promise((resolve, reject) => {
    const args = [scriptPath, '--model_path', modelPath, '--freq', freq];
    if (periods !== undefined && periods !== null) args.push('--periods', String(periods));
    if (from)  args.push('--from', from);
    if (until) args.push('--until', until);
    if (regressors.length) args.push('--regressors', regressors.join(','));

    const py = spawn(pythonBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    py.stdout.on('data', d => (out += d.toString()));
    py.stderr.on('data', d => (err += d.toString()));

    py.on('close', (code) => {
      try {
        const obj = JSON.parse(out);
        if (obj.error) {
          return reject(new Error(obj.message || `Error Python (${code})`));
        }
        resolve(obj);
      } catch (e) {
        reject(new Error(`JSON inválido desde Python: ${e.message}\nOut:\n${out}\nErr:\n${err}`));
      }
    });
  });
}

module.exports = { runPythonForecast };