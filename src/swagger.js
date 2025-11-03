const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const packageJson = require('../package.json');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'API Maconst-Diconst',
      version: packageJson.version || '1.0.0',
      description:
        'Documentación de la API del backend (auth, productos, compras, ventas, reportes, predicción)',
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 4000}`, description: 'Local' },
    ],
    tags: [
      { name: 'Auth', description: 'Autenticación y perfil' },
      { name: 'Productos', description: 'Gestión de productos' },
      { name: 'Compras', description: 'Gestión de compras' },
      { name: 'Ventas', description: 'Gestión de ventas' },
      { name: 'Reportes', description: 'Reportes y analíticas' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT enviado como cookie httpOnly',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiMessage: {
          type: 'object',
          properties: { message: { type: 'string', example: 'OK' } },
        },
        ValidationError: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', example: 'field' },
                  value: { nullable: true },
                  msg: { type: 'string', example: 'campo es requerido' },
                  path: { type: 'string', example: 'nombre' },
                  location: { type: 'string', example: 'body' },
                },
              },
            },
          },
        },

        RegisterRequest: {
          type: 'object',
          required: ['nombre_usuario', 'contrasenia', 'nombre_completo'],
          properties: {
            nombre_usuario: { type: 'string', example: 'admin' },
            contrasenia: { type: 'string', minLength: 6, example: 'admin123' },
            nombre_completo: { type: 'string', example: 'Mario Terceros Villarroel' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['nombre_usuario', 'contrasenia'],
          properties: {
            nombre_usuario: { type: 'string', example: 'admin' },
            contrasenia: { type: 'string', example: 'admin123' },
          },
        },
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre_usuario: { type: 'string', example: 'admin' },
            nombre_completo: { type: 'string', example: 'Mario Terceros Villarroel' },
          },
        },

        Producto: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 19 },
            nombre: { type: 'string', example: 'TERMINAL LATERAL ESPAÑOLA' },
            stock_cantidad: { type: 'integer', example: 0 },
          },
        },
        ProductoCreate: {
          type: 'object',
          required: ['nombre'],
          properties: {
            nombre: { type: 'string', example: 'TERMINAL LATERAL ESPAÑOLA' },
            stock_cantidad: { type: 'integer', minimum: 0, example: 0 },
          },
        },
        ProductoUpdate: {
          type: 'object',
          properties: {
            nombre: { type: 'string', example: 'Placa Lisa #8 (ACT)' },
            stock_cantidad: { type: 'integer', minimum: 0, example: 300 },
          },
        },
        ProductoListResponse: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 37 },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Producto' },
            },
          },
        },
        ProductoAllResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Producto' },
            },
          },
        },
        ProductoStatsResponse: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 120 },
            con_stock: { type: 'integer', example: 110 },
            low_stock: { type: 'integer', example: 8 },
            umbral: { type: 'integer', example: 20 },
          },
        },

        Compra: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 5001 },
            mes: { type: 'string', example: 'ENERO' },
            anio: { type: 'integer', example: 2025 },
            id_producto: { type: ['integer', 'null'], nullable: true, example: 101 },
            cantidad: { type: 'integer', example: 100 },
            precio_unitario: { type: 'number', format: 'double', example: 90.0 },
            precio_total: { type: 'number', format: 'double', example: 9000.0 },
            producto_nombre: { type: ['string', 'null'], nullable: true, example: 'Placa Ondulada #10' },
          },
        },
        CompraCreate: {
          type: 'object',
          required: ['mes', 'anio', 'cantidad', 'precio_unitario'],
          properties: {
            mes: { type: 'string', example: 'ENERO' },
            anio: { type: 'integer', minimum: 1900, example: 2025 },
            id_producto: { type: ['integer', 'null'], nullable: true, example: 101 },
            cantidad: { type: 'integer', minimum: 1, example: 50 },
            precio_unitario: { type: 'number', format: 'double', exclusiveMinimum: 0, example: 88.5 },
          },
        },
        CompraUpdate: {
          type: 'object',
          properties: {
            mes: { type: 'string', example: 'FEBRERO' },
            anio: { type: 'integer', minimum: 1900, example: 2025 },
            id_producto: { type: ['integer', 'null'], nullable: true, example: 102 },
            cantidad: { type: 'integer', minimum: 1, example: 60 },
            precio_unitario: { type: 'number', format: 'double', exclusiveMinimum: 0, example: 92.0 },
          },
        },
        CompraBatchItem: {
          type: 'object',
          required: ['mes', 'anio', 'cantidad', 'precio_unitario'],
          properties: {
            mes: { type: 'string', example: 'MARZO' },
            anio: { type: 'integer', minimum: 1900, example: 2025 },
            id_producto: { type: ['integer', 'null'], nullable: true, example: 101 },
            cantidad: { type: 'integer', minimum: 1, example: 40 },
            precio_unitario: { type: 'number', format: 'double', exclusiveMinimum: 0, example: 91.0 },
          },
        },
        CompraBatchRequest: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/components/schemas/CompraBatchItem' },
        },
        CompraBatchResponse: {
          type: 'object',
          properties: {
            count: { type: 'integer', example: 3 },
            data: { type: 'array', items: { $ref: '#/components/schemas/Compra' } },
          },
        },
        CompraListResponse: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 57 },
            data: { type: 'array', items: { $ref: '#/components/schemas/Compra' } },
          },
        },
        CompraTotalsResponse: {
          type: 'object',
          properties: {
            totalCompras: { type: 'integer', example: 245 },
            totalIngresos: { type: 'number', format: 'double', example: 1823450.75 },
          },
        },

        Venta: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 2001 },
            codigo: { type: 'string', example: 'A001' },
            mes: { type: 'string', example: 'ENERO' },
            anio: { type: 'integer', example: 2025 },
            id_producto: { type: 'integer', example: 101 },
            cantidad: { type: 'integer', example: 10 },
            precio_unitario: { type: 'number', format: 'double', example: 120.5 },
            precio_total: { type: 'number', format: 'double', example: 1205.0 },
            producto_nombre: { type: 'string', example: 'Placa Ondulada #10' },
          },
        },
        VentaCreate: {
          type: 'object',
          required: ['mes', 'anio', 'id_producto', 'cantidad', 'precio_unitario'],
          properties: {
            mes: { type: 'string', example: 'ENERO' },
            anio: { type: 'integer', minimum: 1900, example: 2025 },
            id_producto: { type: 'integer', example: 101 },
            cantidad: { type: 'integer', minimum: 1, example: 10 },
            precio_unitario: { type: 'number', format: 'double', exclusiveMinimum: 0, example: 120.5 },
          },
        },
        VentaUpdate: {
          type: 'object',
          properties: {
            mes: { type: 'string', example: 'FEBRERO' },
            anio: { type: 'integer', minimum: 1900, example: 2025 },
            id_producto: { type: 'integer', example: 101 },
            cantidad: { type: 'integer', minimum: 1, example: 15 },
            precio_unitario: { type: 'number', format: 'double', exclusiveMinimum: 0, example: 125.0 },
          },
        },
        VentaBatchRequest: {
          type: 'array',
          items: { $ref: '#/components/schemas/VentaCreate' },
        },
        VentaBatchResponse: {
          type: 'object',
          properties: {
            count: { type: 'integer', example: 5 },
            data: { type: 'array', items: { $ref: '#/components/schemas/Venta' } },
          },
        },
        VentaListResponse: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 100 },
            data: { type: 'array', items: { $ref: '#/components/schemas/Venta' } },
          },
        },
        VentaTotalsResponse: {
          type: 'object',
          properties: {
            totalVentas: { type: 'integer', example: 200 },
            totalIngresos: { type: 'number', format: 'double', example: 25000.0 },
          },
        },

        ReporteMensualResponse: {
          type: 'object',
          properties: {
            anio: { type: 'integer', example: 2025 },
            labels: { type: 'array', items: { type: 'string', example: 'Ene' } },
            compras: { type: 'array', items: { type: 'number', format: 'double', example: 150000 } },
            ventas: { type: 'array', items: { type: 'number', format: 'double', example: 200000 } },
          },
        },
        ReporteTotalesResponse: {
          type: 'object',
          properties: {
            desde: { type: 'integer', example: 2020 },
            hasta: { type: 'integer', example: 2025 },
            total_compras: { type: 'number', format: 'double', example: 1500000 },
            total_ventas: { type: 'number', format: 'double', example: 2000000 },
          },
        },
        TotalProductosResponse: {
          type: 'object',
          properties: { total_productos: { type: 'integer', example: 250 } },
        },
        TopProductosResponse: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 101 },
              nombre: { type: 'string', example: 'Placa Ondulada #10' },
              unidades: { type: 'integer', example: 150 },
              total_bs: { type: 'number', format: 'double', example: 18000.0 },
            },
          },
        },

        PronosticoCreate: {
          type: 'object',
          required: ['periodos'],
          properties: {
            nombre: { type: 'string', example: 'Pronóstico de Ventas' },
            periodos: { type: 'integer', example: 12 },
            desde: { type: 'string', format: 'date', example: '2025-01-01' },
            hasta: { type: 'string', format: 'date', example: '2025-12-31' },
            frecuencia: { type: 'string', example: 'MS' },
            regresores: { type: 'array', items: { type: 'string', example: 'regresor1' } },
            notas: { type: 'string', example: 'Notas importantes sobre el pronóstico' },
            rutaModelo: { type: 'string', example: 'prophet_model.json' },
          },
        },
        PronosticoUpdate: {
          type: 'object',
          properties: {
            nombre: { type: 'string', example: 'Nuevo nombre del pronóstico' },
            notas: { type: 'string', example: 'Notas actualizadas' },
            regenerar: {
              type: 'object',
              properties: {
                periodos: { type: 'integer', example: 6 },
                desde: { type: 'string', format: 'date', example: '2025-06-01' },
                hasta: { type: 'string', format: 'date', example: '2025-12-31' },
                frecuencia: { type: 'string', example: 'MS' },
                regresores: { type: 'array', items: { type: 'string', example: 'regresor2' } },
              },
            },
          },
        },
        Pronostico: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '605c72ef153207001f5b8c9' },
            nombre: { type: 'string', example: 'Pronóstico de Ventas' },
            periodos: { type: 'integer', example: 12 },
            desde: { type: 'string', format: 'date', example: '2025-01-01' },
            hasta: { type: 'string', format: 'date', example: '2025-12-31' },
            frecuencia: { type: 'string', example: 'MS' },
            regresores: { type: 'array', items: { type: 'string', example: 'regresor1' } },
            predicciones: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fecha: { type: 'string', format: 'date', example: '2025-01-01' },
                  pronostico: { type: 'number', example: 120000.5 },
                  limite_inferior: { type: 'number', example: 110000.0 },
                  limite_superior: { type: 'number', example: 130000.0 },
                },
              },
            },
            notas: { type: 'string', example: 'Pronóstico con ajustes importantes' },
            rutaModelo: { type: 'string', example: 'prophet_maconst_v1.json' },
            metaModelo: {
              type: 'object',
              properties: {
                ultimaFechaModelo: { type: 'string', format: 'date', example: '2025-05-01' },
              },
            },
            creadoEn: { type: 'string', format: 'date-time', example: '2025-01-01T10:00:00Z' },
            actualizadoEn: { type: 'string', format: 'date-time', example: '2025-06-01T10:00:00Z' },
          },
        },
        PronosticoListResponse: {
          type: 'array',
          items: { $ref: '#/components/schemas/Pronostico' },
        },
      },
    },
  },

  apis: [
    './src/routes/**/*.js',
    './src/index.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

function swaggerDocs(app) {
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      swaggerOptions: { persistAuthorization: true },
    })
  );

  app.get('/docs.json', (_req, res) => res.json(swaggerSpec));
  console.log('Swagger listo en: /docs');
}

module.exports = { swaggerDocs };