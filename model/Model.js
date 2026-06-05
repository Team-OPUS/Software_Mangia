// ============================================================
//  MANGIA — MODEL (datos y estado de la aplicación)
// ============================================================

const fmt = n => '$ ' + Math.round(n).toLocaleString('es-CO');
const now  = () => { const d = new Date(); return d.toTimeString().slice(0, 5); };
const today = () => new Date().toISOString().slice(0, 10);
const dt   = () => { const d = new Date(); return d.toLocaleDateString('es-CO') + ' ' + d.toTimeString().slice(0, 5); };

let _idSeq = 200;
const genId = () => ++_idSeq;

// ── Estado global ────────────────────────────────────────────
const Model = {
  currentUser:       null,
  loginAttempts:     {},
  editingId:         null,
  orderItems:        [],
  pedidoMesaId:      null,
  modificarPedidoId: null,
  listaEspera:       [],
  lastFactura:       null,
  offlineQueue:      [],
  isOnline:          navigator.onLine,
  _pendingReservaData: null,

  // ── Usuarios ──────────────────────────────────────────────
  users: [
    { id:1, username:'admin',   pass:'1234', name:'Yuber Quintero',  email:'yuber.quintero@mangia.com', role:'Administrador', initials:'YQ', status:'activo' },
    { id:2, username:'mesero',  pass:'1234', name:'Diego Mendoza',   email:'diego.mendoza@mangia.com',  role:'Mesero',        initials:'DM', status:'activo' },
    { id:3, username:'cocinero',pass:'1234', name:'Mauricio Rosero', email:'mauricio.rosero@mangia.com',role:'Cocinero',      initials:'MR', status:'activo' },
    { id:4, username:'cajero',  pass:'1234', name:'Cajero Sistema',  email:'cajero@mangia.com',         role:'Cajero',        initials:'CS', status:'activo' },
  ],

  // ── Mesas ─────────────────────────────────────────────────
  mesas: [
    { id:'M-01', estado:'libre',    mesero:null,             comensales:0, horaApertura:null,  pedidos:[] },
    { id:'M-02', estado:'ocupada',  mesero:'Diego Mendoza',  comensales:3, horaApertura:'12:30', pedidos:[] },
    { id:'M-03', estado:'ocupada',  mesero:'Diego Mendoza',  comensales:4, horaApertura:'12:45', pedidos:[] },
    { id:'M-04', estado:'reservada',mesero:null,             comensales:0, horaApertura:null,  pedidos:[] },
    { id:'M-05', estado:'libre',    mesero:null,             comensales:0, horaApertura:null,  pedidos:[] },
    { id:'M-06', estado:'ocupada',  mesero:'Yuber Quintero', comensales:2, horaApertura:'13:00', pedidos:[] },
    { id:'M-07', estado:'cuenta',   mesero:'Yuber Quintero', comensales:4, horaApertura:'12:15', pedidos:[] },
    { id:'M-08', estado:'ocupada',  mesero:'Mauricio Rosero',comensales:5, horaApertura:'13:10', pedidos:[] },
    { id:'M-09', estado:'libre',    mesero:null,             comensales:0, horaApertura:null,  pedidos:[] },
    { id:'M-10', estado:'ocupada',  mesero:'Diego Mendoza',  comensales:2, horaApertura:'13:20', pedidos:[] },
    { id:'M-11', estado:'libre',    mesero:null,             comensales:0, horaApertura:null,  pedidos:[] },
    { id:'M-12', estado:'libre',    mesero:null,             comensales:0, horaApertura:null,  pedidos:[] },
  ],

  // ── Menú ──────────────────────────────────────────────────
  menu: [
    { id:1, nombre:'Pasta Carbonara',    cat:'Pastas',  precio:28000, desc:'Pasta con tocineta, huevo y parmesano',          tiempo:'15 min', disponible:true  },
    { id:2, nombre:'Lasagna Mangia',     cat:'Pastas',  precio:32000, desc:'Lasagna de carne con salsa boloñesa',            tiempo:'20 min', disponible:true  },
    { id:3, nombre:'Pizza Margherita',   cat:'Pizzas',  precio:26000, desc:'Pizza clásica con mozzarella y albahaca',        tiempo:'18 min', disponible:true  },
    { id:4, nombre:'Pizza Cuatro Quesos',cat:'Pizzas',  precio:30000, desc:'Mozzarella, parmesano, gorgonzola y ricotta',    tiempo:'18 min', disponible:true  },
    { id:5, nombre:'Risotto al Funghi',  cat:'Pastas',  precio:35000, desc:'Arroz cremoso con hongos mixtos',                tiempo:'22 min', disponible:true  },
    { id:6, nombre:'Tiramisú casero',    cat:'Postres', precio:12000, desc:'Postre clásico italiano con mascarpone',         tiempo:'5 min',  disponible:true  },
    { id:7, nombre:'Limonada de Hierbas',cat:'Bebidas', precio:8000,  desc:'Limonada con menta y albahaca fresca',           tiempo:'3 min',  disponible:true  },
    { id:8, nombre:'Vino Tinto copa',    cat:'Bebidas', precio:15000, desc:'Copa de vino tinto de la casa',                  tiempo:'1 min',  disponible:false },
    { id:9, nombre:'Ensalada Caprese',   cat:'Entradas',precio:18000, desc:'Tomate, mozzarella y albahaca con aceite de oliva',tiempo:'8 min', disponible:true  },
  ],

  // ── Recetas ────────────────────────────────────────────────
  recetas: {
    1: [{ insumoId:1, qty:0.1  }, { insumoId:6, qty:0.2  }, { insumoId:5, qty:0.02 }],
    2: [{ insumoId:2, qty:0.2  }, { insumoId:1, qty:0.2  }, { insumoId:3, qty:0.1  }, { insumoId:6, qty:0.15 }],
    3: [{ insumoId:1, qty:0.15 }, { insumoId:3, qty:0.12 }, { insumoId:4, qty:0.25 }],
    4: [{ insumoId:3, qty:0.2  }, { insumoId:4, qty:0.25 }],
    5: [{ insumoId:5, qty:0.03 }, { insumoId:8, qty:10   }, { insumoId:7, qty:0.1  }],
    6: [],
    7: [{ insumoId:8, qty:5    }],
    8: [{ insumoId:7, qty:1    }],
    9: [{ insumoId:1, qty:0.15 }, { insumoId:3, qty:0.1  }, { insumoId:5, qty:0.02 }],
  },

  // ── Inventario ─────────────────────────────────────────────
  inventario: [
    { id:1, nombre:'Tomate fresco',    unidad:'kg',     stock:12.5, minimo:5.0,  proveedorId:1 },
    { id:2, nombre:'Carne molida',     unidad:'kg',     stock:3.2,  minimo:5.0,  proveedorId:2 },
    { id:3, nombre:'Queso mozzarella', unidad:'kg',     stock:8.4,  minimo:3.0,  proveedorId:3 },
    { id:4, nombre:'Harina de trigo',  unidad:'kg',     stock:0.8,  minimo:10.0, proveedorId:4 },
    { id:5, nombre:'Aceite de oliva',  unidad:'L',      stock:6.2,  minimo:3.0,  proveedorId:5 },
    { id:6, nombre:'Pasta seca',       unidad:'kg',     stock:4.5,  minimo:8.0,  proveedorId:6 },
    { id:7, nombre:'Vino para cocina', unidad:'botella',stock:5,    minimo:2,    proveedorId:7 },
    { id:8, nombre:'Hierbas aromáticas',unidad:'g',     stock:850,  minimo:300,  proveedorId:1 },
  ],

  // ── Proveedores ────────────────────────────────────────────
  proveedores: [
    { id:1, nombre:'Verduras Aguachica',  tel:'311-555-0101', email:'verduras@agua.com', productos:'Frutas, verduras, hierbas',  condPago:'Crédito 30d', dir:'Cra 5 #10-20, Aguachica', status:'activo' },
    { id:2, nombre:'Carnes del Sur',      tel:'310-555-0102', email:'carnes@sur.com',    productos:'Carnes, embutidos',           condPago:'Contado',     dir:'Cll 8 #5-30, Aguachica',  status:'activo' },
    { id:3, nombre:'Lácteos La Vaca',     tel:'312-555-0103', email:'lacteos@vaca.com',  productos:'Lácteos, quesos',             condPago:'Crédito 15d', dir:'Cra 12 #7-10',            status:'activo' },
    { id:4, nombre:'Distrim. Aguachica',  tel:'313-555-0104', email:'dist@agua.com',     productos:'Harinas, granos',             condPago:'Crédito 30d', dir:'Cll 15 #20-40',           status:'activo' },
    { id:5, nombre:'Importadora Italiana',tel:'314-555-0105', email:'import@it.com',     productos:'Aceites, vinos importados',   condPago:'Contado',     dir:'Bogotá',                  status:'activo' },
    { id:6, nombre:'Pastas del Norte',    tel:'315-555-0106', email:'pastas@norte.com',  productos:'Pastas secas',                condPago:'Crédito 15d', dir:'Barranquilla',            status:'activo' },
    { id:7, nombre:'Distrib. Costeña',    tel:'316-555-0107', email:'dist@coste.com',    productos:'Bebidas, licores',            condPago:'Crédito 30d', dir:'Valledupar',              status:'activo' },
  ],

  // ── Reservas ───────────────────────────────────────────────
  get reservas() {
    if (!this._reservas) {
      this._reservas = [
        { id:1, cliente:'Andrea López',   fecha:today(), hora:'12:30', personas:4, mesa:'M-05', tel:'311-222-5555', estado:'confirmada', obs:'' },
        { id:2, cliente:'Carlos Pérez',   fecha:today(), hora:'13:00', personas:2, mesa:'M-08', tel:'310-444-5555', estado:'confirmada', obs:'' },
        { id:3, cliente:'Familia Ramírez',fecha:today(), hora:'13:30', personas:6, mesa:'M-09', tel:'320-666-7777', estado:'confirmada', obs:'Cumpleaños' },
        { id:4, cliente:'María Gómez',    fecha:today(), hora:'19:00', personas:3, mesa:'M-04', tel:'315-888-9999', estado:'pendiente',  obs:'' },
        { id:5, cliente:'Juan Torres',    fecha:today(), hora:'19:30', personas:4, mesa:'M-07', tel:'316-000-1111', estado:'confirmada', obs:'' },
        { id:6, cliente:'Sofía Martínez', fecha:today(), hora:'20:00', personas:2, mesa:'M-02', tel:'317-222-3333', estado:'pendiente',  obs:'Vegana' },
      ];
    }
    return this._reservas;
  },

  // ── Pedidos ───────────────────────────────────────────────
  get pedidos() {
    if (!this._pedidos) {
      this._pedidos = [
        { id:101, mesaId:'M-02', mesero:'Diego Mendoza',  items:[{ id:1, nombre:'Pasta Carbonara',    qty:2, precio:28000 },{ id:7, nombre:'Limonada de Hierbas', qty:2, precio:8000 }],  obs:'Sin tocineta en una', estado:'preparando', hora:'12:31', fecha:today(), total:72000 },
        { id:102, mesaId:'M-03', mesero:'Diego Mendoza',  items:[{ id:2, nombre:'Lasagna Mangia',     qty:1, precio:32000 },{ id:3, nombre:'Pizza Margherita',   qty:1, precio:26000 }],  obs:'',                    estado:'preparando', hora:'12:47', fecha:today(), total:58000 },
        { id:103, mesaId:'M-06', mesero:'Yuber Quintero', items:[{ id:5, nombre:'Risotto al Funghi',  qty:1, precio:35000 }],                                                              obs:'Sin queso',           estado:'nuevo',      hora:'13:02', fecha:today(), total:35000 },
        { id:104, mesaId:'M-07', mesero:'Yuber Quintero', items:[{ id:1, nombre:'Pasta Carbonara',    qty:2, precio:28000 },{ id:6, nombre:'Tiramisú casero',    qty:2, precio:12000 },{ id:7, nombre:'Limonada de Hierbas', qty:4, precio:8000 }], obs:'', estado:'listo', hora:'12:17', fecha:today(), total:112000 },
      ];
    }
    return this._pedidos;
  },

  // ── Facturas ───────────────────────────────────────────────
  get facturas() {
    if (!this._facturas) {
      this._facturas = [
        { id:'F-001', mesaId:'M-01', items:[{ nombre:'Pizza Margherita',  qty:2, precio:26000 },{ nombre:'Limonada de Hierbas', qty:2, precio:8000 }],  subtotal:68000,  descuento:0,    propina:6800,  total:74800,  metodoPago:'Efectivo',        mesero:'Diego Mendoza',   cajero:'Cajero Sistema', hora:'11:45', fecha:today() },
        { id:'F-002', mesaId:'M-05', items:[{ nombre:'Pasta Carbonara',   qty:1, precio:28000 },{ nombre:'Ensalada Caprese',   qty:1, precio:18000 }],  subtotal:46000,  descuento:2300, propina:4370,  total:48070,  metodoPago:'Nequi',           mesero:'Mauricio Rosero', cajero:'Cajero Sistema', hora:'12:05', fecha:today() },
        { id:'F-003', mesaId:'M-11', items:[{ nombre:'Pizza Cuatro Quesos',qty:2, precio:30000 },{ nombre:'Vino Tinto copa',   qty:2, precio:15000 },{ nombre:'Tiramisú casero', qty:2, precio:12000 }], subtotal:114000, descuento:0, propina:11400, total:125400, metodoPago:'Tarjeta crédito', mesero:'Diego Mendoza',   cajero:'Cajero Sistema', hora:'12:50', fecha:today() },
      ];
    }
    return this._facturas;
  },

  // ── Auditoría ─────────────────────────────────────────────
  get auditLog() {
    if (!this._auditLog) {
      this._auditLog = [
        { id:1, usuario:'admin',  rol:'Administrador', accion:'Inicio de sesión', modulo:'Sesión',     detalle:'Login exitoso desde IP local',              fecha:today(), hora:'08:00' },
        { id:2, usuario:'mesero', rol:'Mesero',        accion:'Inicio de sesión', modulo:'Sesión',     detalle:'Login exitoso',                             fecha:today(), hora:'08:05' },
        { id:3, usuario:'admin',  rol:'Administrador', accion:'Creación',         modulo:'Menú',       detalle:'Plato "Ensalada Caprese" creado',            fecha:today(), hora:'08:15' },
        { id:4, usuario:'mesero', rol:'Mesero',        accion:'Pedido enviado',   modulo:'Pedidos',    detalle:'Pedido #101 para M-02 enviado a cocina',     fecha:today(), hora:'12:31' },
        { id:5, usuario:'cajero', rol:'Cajero',        accion:'Factura emitida',  modulo:'Facturación',detalle:'Factura F-001 por $74.800 — Efectivo',       fecha:today(), hora:'11:45' },
      ];
    }
    return this._auditLog;
  },
};

// ── Helpers de acceso rápido ───────────────────────────────
Model.findMesa       = id => Model.mesas.find(m => m.id === id);
Model.findPlato      = id => Model.menu.find(p => p.id === id);
Model.findInsumo     = id => Model.inventario.find(i => i.id === id);
Model.findProveedor  = id => Model.proveedores.find(p => p.id === id);
Model.findPedido     = id => Model.pedidos.find(p => p.id === id);
Model.findUser       = id => Model.users.find(u => u.id === id);

// ── Log de auditoría ──────────────────────────────────────
function logAudit(accion, modulo, detalle) {
  Model.auditLog.unshift({
    id: genId(),
    usuario: Model.currentUser ? Model.currentUser.username : 'sistema',
    rol:     Model.currentUser ? Model.currentUser.role     : '—',
    accion, modulo, detalle,
    fecha: today(), hora: now(),
  });
}
