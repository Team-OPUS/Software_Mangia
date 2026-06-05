// ============================================================
//  MANGIA — VIEW (renderizado de la interfaz)
// ============================================================

// ── Navegación por roles ───────────────────────────────────
const NAV_BY_ROLE = {
  Administrador: [
    { id:'dashboard',     label:'Dashboard'        },
    { id:'mesas',         label:'Mesas'            },
    { id:'menu',          label:'Menú'             },
    { id:'pedidos',       label:'Pedidos'          },
    { id:'cocina',        label:'Cocina'           },
    { id:'inventario',    label:'Inventario'       },
    { id:'alertas',       label:'Alertas'          },
    { id:'proveedores',   label:'Proveedores'      },
    { id:'reservas',      label:'Reservas'         },
    { id:'facturacion',   label:'Facturación'      },
    { id:'caja',          label:'Cierre de Caja'   },
    { id:'reportes',      label:'Reportes'         },
    { id:'auditoria',     label:'Auditoría'        },
    { id:'usuarios',      label:'Usuarios'         },
    { id:'configuracion', label:'Configuración'    },
  ],
  Mesero: [
    { id:'dashboard',    label:'Dashboard'     },
    { id:'mesas',        label:'Mesas'         },
    { id:'pedidos',      label:'Pedidos'       },
    { id:'cocina',       label:'Cocina'        },
    { id:'reservas',     label:'Reservas'      },
    { id:'facturacion',  label:'Facturación'   },
    { id:'configuracion',label:'Configuración' },
  ],
  Cocinero: [
    { id:'cocina',        label:'Cocina'        },
    { id:'menu',          label:'Menú'          },
    { id:'inventario',    label:'Inventario'    },
    { id:'configuracion', label:'Configuración' },
  ],
  Cajero: [
    { id:'dashboard',     label:'Dashboard'       },
    { id:'facturacion',   label:'Facturación'     },
    { id:'caja',          label:'Cierre de Caja'  },
    { id:'reportes',      label:'Reportes'        },
    { id:'reservas',      label:'Reservas'        },
    { id:'configuracion', label:'Configuración'   },
  ],
};

const PAGE_TITLE_MAP = {
  dashboard:           'Dashboard',
  mesas:               'Gestor de Mesas',
  menu:                'Gestor de Menú',
  pedidos:             'Toma de Pedido',
  cocina:              'Pantalla de Cocina',
  inventario:          'Gestor de Inventario',
  alertas:             'Alertas de Stock',
  proveedores:         'Gestor de Proveedores',
  reservas:            'Gestión de Reservas',
  facturacion:         'Facturación',
  'factura-pdf':       'Comprobante de Pago',
  caja:                'Cierre de Caja',
  reportes:            'Módulo de Reportes',
  'reporte-ventas':    'Reporte de Ventas',
  'reporte-productos': 'Reporte — Productos más Vendidos',
  'reporte-inventario-rpt': 'Reporte — Consumo de Inventario',
  'reporte-horaspico': 'Reporte — Horas Pico',
  'reporte-personal':  'Reporte — Personal',
  'reporte-comparacion':'Reporte — Comparativo',
  auditoria:           'Auditoría del Sistema',
  usuarios:            'Gestión de Usuarios',
  configuracion:       'Configuración',
  modificar:           'Modificar Pedido',
};

const PAGE_ID_MAP = {
  dashboard:              null, // resuelto dinámicamente
  'reporte-ventas':       'page-reporte-ventas',
  'reporte-comparacion':  'page-reporte-comparacion',
  'reporte-productos':    'page-reporte-productos',
  'reporte-horaspico':    'page-reporte-horaspico',
  'reporte-personal':     'page-reporte-personal',
  'reporte-inventario-rpt':'page-reporte-inventario-rpt',
  'factura-pdf':          'page-factura-pdf',
  alertas:                'page-alertas',
  modificar:              'page-modificar',
  auditoria:              'page-auditoria',
};

// ── Navegación ─────────────────────────────────────────────
function nav(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  let domId;
  if (pageId === 'dashboard') {
    domId = (Model.currentUser && Model.currentUser.role === 'Mesero')
      ? 'page-dashboard-mesero' : 'page-dashboard';
  } else {
    domId = PAGE_ID_MAP[pageId] || `page-${pageId}`;
  }

  const el = document.getElementById(domId);
  if (el) el.classList.add('active');

  document.querySelectorAll('#sidebar-nav a').forEach(a => a.classList.remove('active'));
  const navEl = document.getElementById(`nav-${pageId}`);
  if (navEl) navEl.classList.add('active');

  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = PAGE_TITLE_MAP[pageId] || 'Mangia';

  // Llamar render del módulo correspondiente
  ViewRouter.onNav(pageId);
}

// ── Construir sidebar según rol ────────────────────────────
function buildNav(role) {
  const items = NAV_BY_ROLE[role] || NAV_BY_ROLE['Administrador'];
  document.getElementById('sidebar-nav').innerHTML = items.map(i =>
    `<a onclick="nav('${i.id}')" id="nav-${i.id}">${i.label}</a>`
  ).join('');
}

// ── Toast ──────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ── Modal helpers ──────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function confirmAction(title, msg, fn) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent   = msg;
  document.getElementById('confirm-btn').onclick = () => { closeModal('modal-confirm'); fn(); };
  openModal('modal-confirm');
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

// ── Reloj topbar ───────────────────────────────────────────
function startClock() {
  function tick() {
    const d  = new Date();
    const s  = d.toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
              + ' — ' + d.toTimeString().slice(0, 5);
    const el = document.getElementById('topbar-sub');
    if (el) el.textContent = s;
  }
  tick(); setInterval(tick, 30000);
}

// ── Charts (dashboard) ─────────────────────────────────────
function initCharts() {
  const ctx1 = document.getElementById('chart-ventas');
  if (ctx1 && !ctx1._chart) {
    ctx1._chart = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
        datasets: [{ data:[980,1150,1020,1280,1420,1380,1245], backgroundColor:'#1a1a1a', borderRadius:2 }],
      },
      options: { plugins:{ legend:{ display:false } }, scales:{ y:{ ticks:{ callback: v => v+'k' } }, x:{ grid:{ display:false } } }, responsive:true },
    });
  }
  const ctx2 = document.getElementById('chart-platos');
  if (ctx2 && !ctx2._chart) {
    ctx2._chart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['Pasta Carb.','Lasagna','Pizza Margh.','Risotto','Tiramisú'],
        datasets: [{ data:[78,62,54,38,48], backgroundColor:['#1a1a1a','#555','#888','#aaa','#ccc'], borderRadius:2 }],
      },
      options: { indexAxis:'y', plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{ display:false } } }, responsive:true },
    });
  }
}

// ── Mesas ──────────────────────────────────────────────────
function renderMesas(filtro) {
  let items = filtro === 'todas' ? Model.mesas : Model.mesas.filter(m => m.estado === filtro);
  const total  = Model.mesas.length;
  const libres = Model.mesas.filter(m => m.estado === 'libre').length;
  const ocup   = Model.mesas.filter(m => ['ocupada','cuenta'].includes(m.estado)).length;
  document.getElementById('mesas-summary').textContent =
    `${total} mesas — ${libres} libres — ${ocup} en servicio`;
  document.getElementById('mesa-grid').innerHTML = items.map(m => `
    <div class="mesa-card ${m.estado}" onclick="Controller.mesa.click('${m.id}')">
      <div class="mesa-num">${m.id}</div>
      <div class="mesa-estado"><span class="badge badge-${m.estado}">${m.estado}</span></div>
      <div class="mesa-info">${m.mesero ? m.mesero : '—'}</div>
      <div class="mesa-info">${m.comensales ? m.comensales + ' personas' : ''}</div>
      <div class="mesa-info">${m.horaApertura ? 'Desde ' + m.horaApertura : ''}</div>
    </div>`).join('');
}

// ── Menú (gestión) ─────────────────────────────────────────
function renderMenuTable(q, cat) {
  let items = Model.menu;
  if (q)   items = items.filter(i => i.nombre.toLowerCase().includes(q.toLowerCase()));
  if (cat) items = items.filter(i => i.cat === cat);
  const activos = Model.menu.filter(i => i.disponible).length;
  document.getElementById('menu-summary').textContent = `${Model.menu.length} platos — ${activos} activos`;
  document.getElementById('menu-tbody').innerHTML = items.map(m => `<tr>
    <td>${m.id}</td>
    <td>
      ${m.img ? `<img src="${m.img}" style="width:40px;height:40px;object-fit:cover;border:1px solid var(--border);margin-right:8px;vertical-align:middle;" alt="">` : ''}
      <strong>${m.nombre}</strong><br><span style="font-size:11px;color:var(--text-light);">${m.desc || ''}</span>
    </td>
    <td>${m.cat}</td><td>${fmt(m.precio)}</td>
    <td><span class="badge badge-${m.disponible ? 'activo' : 'inactivo'}">${m.disponible ? 'Activo' : 'Inactivo'}</span></td>
    <td>
      <button class="btn btn-sm btn-secondary" onclick="Controller.menu.openModal(${m.id})">Editar</button>
      <button class="btn btn-sm btn-secondary" onclick="Controller.menu.toggleEstado(${m.id})">${m.disponible ? 'Desactivar' : 'Activar'}</button>
      <button class="btn btn-sm btn-danger"    onclick="Controller.menu.delete(${m.id})">Eliminar</button>
    </td></tr>`).join('') || `<tr><td colspan="6" class="empty-state">Sin resultados</td></tr>`;
}

// ── Menú (toma de pedido) ──────────────────────────────────
function renderMenuItems(filter) {
  const items = filter
    ? Model.menu.filter(i => i.cat === filter && i.disponible)
    : Model.menu.filter(i => i.disponible);
  document.getElementById('menu-items-list').innerHTML = items.map(i => `
    <div class="menu-item">
      <div style="display:flex;align-items:center;gap:10px;">
        ${i.img
          ? `<img src="${i.img}" style="width:44px;height:44px;object-fit:cover;border:1px solid var(--border);flex-shrink:0;" alt="">`
          : `<div style="width:44px;height:44px;background:#f0ece6;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🍽</div>`}
        <div>
          <div class="menu-item-name">${i.nombre}</div>
          <div class="menu-item-price">${fmt(i.precio)}</div>
          ${i.tiempo ? `<div style="font-size:10px;color:var(--text-light);">${i.tiempo}</div>` : ''}
        </div>
      </div>
      <button class="add-btn" onclick="Controller.pedido.addItem(${i.id})">+</button>
    </div>`).join('');
}

// ── Order panel ────────────────────────────────────────────
function renderOrder() {
  const el = document.getElementById('order-items');
  el.innerHTML = Model.orderItems.map(i => `
    <div class="order-item">
      <span class="order-item-name">${i.nombre}</span>
      <span class="order-item-qty">
        <button class="qty-btn" onclick="Controller.pedido.changeQty(${i.id}, -1)">−</button>
        <span>${i.qty}</span>
        <button class="qty-btn" onclick="Controller.pedido.changeQty(${i.id}, 1)">+</button>
      </span>
      <span class="order-item-total">${fmt(i.precio * i.qty)}</span>
    </div>`).join('');
  const total = Model.orderItems.reduce((s, i) => s + i.precio * i.qty, 0);
  document.getElementById('order-total').textContent = fmt(total);
}

// ── Cocina ─────────────────────────────────────────────────
function renderCocina() {
  const cols = { nuevo:'col-nuevos', preparando:'col-preparando', listo:'col-listos' };
  Object.entries(cols).forEach(([estado, colId]) => {
    const ped = Model.pedidos.filter(p => p.estado === estado);
    document.getElementById(colId).innerHTML = ped.length === 0
      ? '<div class="empty-state" style="font-size:12px;">Sin pedidos</div>'
      : ped.map(p => `
        <div class="pedido-ticket">
          <div class="pedido-ticket-header"><span>${p.mesaId} #${p.id}</span><span>${p.hora}</span></div>
          <div class="pedido-ticket-items">${p.items.map(i => i.nombre + ' x' + i.qty).join('<br>')}</div>
          ${p.obs ? `<div class="pedido-ticket-obs">Obs: ${p.obs}</div>` : ''}
          ${estado === 'nuevo'      ? `<button class="btn btn-primary btn-sm" style="width:100%;margin-top:8px;justify-content:center;" onclick="Controller.cocina.moverTicket(${p.id},'preparando')">Marcar → En preparación</button>` : ''}
          ${estado === 'preparando' ? `<button class="btn btn-warning btn-sm" style="width:100%;margin-top:8px;justify-content:center;" onclick="Controller.cocina.moverTicket(${p.id},'listo')">Marcar → Listo</button>` : ''}
          ${estado === 'listo'      ? `<button class="btn btn-success btn-sm" style="width:100%;margin-top:8px;justify-content:center;" onclick="Controller.cocina.marcarServido(${p.id})">✓ Servido</button>` : ''}
        </div>`).join('');
  });
}

// ── Inventario ─────────────────────────────────────────────
function renderInventario(q, filtro) {
  let items = Model.inventario;
  if (q)      items = items.filter(i => i.nombre.toLowerCase().includes(q.toLowerCase()));
  if (filtro === 'critico') items = items.filter(i => i.stock <= i.minimo);
  if (filtro === 'normal')  items = items.filter(i => i.stock > i.minimo);
  const criticos = Model.inventario.filter(i => i.stock <= i.minimo).length;
  document.getElementById('inventario-summary').textContent =
    `${Model.inventario.length} insumos — ${criticos} en estado crítico`;
  document.getElementById('inventario-tbody').innerHTML = items.map(i => {
    const prov = Model.findProveedor(i.proveedorId);
    const est  = i.stock <= i.minimo ? 'critico' : 'normal';
    return `<tr>
      <td><strong>${i.nombre}</strong></td>
      <td>${i.unidad}</td>
      <td>${i.stock}</td>
      <td>${i.minimo}</td>
      <td><span class="badge badge-${est}">${est === 'critico' ? 'Crítico' : 'Normal'}</span></td>
      <td>${prov ? prov.nombre : '—'}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="Controller.inventario.openModal(${i.id})">Editar</button>
        <button class="btn btn-sm btn-secondary" onclick="Controller.inventario.openAjuste(${i.id})">Ajustar</button>
        <button class="btn btn-sm btn-danger"    onclick="Controller.inventario.delete(${i.id})">Eliminar</button>
      </td></tr>`;
  }).join('') || `<tr><td colspan="7" class="empty-state">Sin resultados</td></tr>`;
}

// ── Alertas ────────────────────────────────────────────────
function renderAlertas() {
  const criticos = Model.inventario.filter(i => i.stock <= i.minimo);
  document.getElementById('alertas-summary').textContent = `${criticos.length} alertas activas`;
  if (criticos.length === 0) {
    document.getElementById('alertas-panel').innerHTML = '<div class="empty-state">✓ Todos los insumos están en niveles normales.</div>';
    return;
  }
  document.getElementById('alertas-panel').innerHTML = `
    <div class="alert-banner">⚠ Alerta de Stock Mínimo — ${criticos.length} insumo(s) en nivel crítico:</div>
    ${criticos.map(i => {
      const prov = Model.findProveedor(i.proveedorId);
      return `<div class="alert-item">
        <div class="alert-item-left">
          <div class="alert-item-name">${i.nombre}</div>
          <div class="alert-item-detail">Stock actual: ${i.stock} ${i.unidad} &nbsp;|&nbsp; Mín: ${i.minimo} ${i.unidad}</div>
        </div>
        <div class="alert-item-right">${prov ? prov.nombre : 'Sin proveedor'}<br>
          <button class="btn btn-sm btn-primary" style="margin-top:6px;" onclick="Controller.inventario.openAjuste(${i.id})">Reabastecer</button>
        </div>
      </div>`;
    }).join('')}
    <div class="alert-footer">
      <button class="btn btn-secondary" onclick="Controller.alertas.marcarAtendidas()">Marcar atendidas</button>
      <button class="btn btn-warning"   onclick="Controller.alertas.notificarAdmin()">📧 Notificar admin</button>
      <button class="btn btn-primary"   onclick="Controller.alertas.generarPedido()">Generar pedido a proveedor</button>
    </div>`;
}

function updateNotifBadge() {
  const n  = Model.inventario.filter(i => i.stock <= i.minimo).length;
  const el = document.getElementById('notif-badge');
  if (el) el.textContent = n > 0 ? `⚠ ${n} alerta${n > 1 ? 's' : ''}` : '';
}

// ── Proveedores ────────────────────────────────────────────
function renderProveedores(q) {
  let items = Model.proveedores.filter(p => p.status === 'activo');
  if (q) items = items.filter(p =>
    p.nombre.toLowerCase().includes(q.toLowerCase()) ||
    p.productos.toLowerCase().includes(q.toLowerCase()));
  document.getElementById('prov-summary').textContent =
    `${Model.proveedores.filter(p => p.status === 'activo').length} proveedores activos`;
  document.getElementById('prov-tbody').innerHTML = items.map(p => `<tr>
    <td><strong>${p.nombre}</strong></td><td>${p.tel}</td>
    <td>${p.productos}</td><td>${p.condPago}</td>
    <td><span class="badge badge-activo">Activo</span></td>
    <td>
      <button class="btn btn-sm btn-secondary" onclick="Controller.proveedores.openModal(${p.id})">Editar</button>
      <button class="btn btn-sm btn-danger"    onclick="Controller.proveedores.delete(${p.id})">Eliminar</button>
    </td></tr>`).join('') || `<tr><td colspan="6" class="empty-state">Sin resultados</td></tr>`;
}

// ── Reservas ───────────────────────────────────────────────
function renderReservas() {
  const fecha  = document.getElementById('res-fecha-filter')?.value || today();
  const estado = document.getElementById('res-estado-filter')?.value || '';
  let items = Model.reservas.filter(r => r.fecha === fecha);
  if (estado) items = items.filter(r => r.estado === estado);
  document.getElementById('reservas-summary').textContent = `${items.length} reservas — ${fecha}`;
  document.getElementById('reservas-tbody').innerHTML = items.length === 0
    ? `<tr><td colspan="7" class="empty-state">Sin reservas para esta fecha</td></tr>`
    : items.map(r => `<tr>
        <td>${r.hora}</td>
        <td><strong>${r.cliente}</strong><br><span style="font-size:11px;color:var(--text-light);">${r.obs}</span></td>
        <td>${r.personas}</td><td>${r.mesa || '—'}</td><td>${r.tel}</td>
        <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="Controller.reservas.openModal(${r.id})">Editar</button>
          <button class="btn btn-sm btn-danger"    onclick="Controller.reservas.cancelar(${r.id})">Cancelar</button>
        </td></tr>`).join('');
}

// ── Usuarios ───────────────────────────────────────────────
function renderUsuarios(q) {
  let items = Model.users;
  if (q) items = items.filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    u.username.toLowerCase().includes(q.toLowerCase()));
  document.getElementById('users-summary').textContent =
    `${Model.users.filter(u => u.status === 'activo').length} usuarios activos`;
  document.getElementById('users-tbody').innerHTML = items.map(u => `<tr>
    <td><strong>${u.name}</strong><br><span style="font-size:11px;color:var(--text-light);">${u.email}</span></td>
    <td>${u.username}</td>
    <td>${u.role}</td>
    <td><span class="badge badge-${u.status}">${u.status}</span></td>
    <td>
      <button class="btn btn-sm btn-secondary" onclick="Controller.usuarios.openModal(${u.id})">Editar</button>
      <button class="btn btn-sm btn-secondary" onclick="Controller.usuarios.toggle(${u.id})">${u.status === 'activo' ? 'Desactivar' : 'Activar'}</button>
      <button class="btn btn-sm btn-warning"   onclick="Controller.usuarios.resetPass(${u.id})">Reset pass</button>
    </td></tr>`).join('');
}

// ── Auditoría ──────────────────────────────────────────────
function renderAuditoria(q, modulo) {
  let items = [...Model.auditLog];
  if (q)      items = items.filter(l => l.accion.toLowerCase().includes(q.toLowerCase()) || l.detalle.toLowerCase().includes(q.toLowerCase()));
  if (modulo) items = items.filter(l => l.modulo === modulo);
  document.getElementById('audit-tbody').innerHTML = items.slice(0, 200).map(l => `<tr>
    <td>${l.fecha} ${l.hora}</td>
    <td>${l.usuario}</td>
    <td>${l.rol}</td>
    <td>${l.modulo}</td>
    <td>${l.accion}</td>
    <td style="font-size:11px;">${l.detalle}</td>
  </tr>`).join('') || `<tr><td colspan="6" class="empty-state">Sin registros</td></tr>`;
}

// ── Configuración ──────────────────────────────────────────
function renderConfig() {
  const u = Model.currentUser;
  document.getElementById('config-title').textContent = `Configuración — ${u.role}`;
  document.getElementById('config-sub').textContent   = `${u.name} — Rol: ${u.role}`;
  document.getElementById('config-info-rows').innerHTML = `
    <div class="info-row"><span>Nombre:</span><span class="info-val">${u.name}</span></div>
    <div class="info-row"><span>Correo:</span><span class="info-val">${u.email}</span></div>
    <div class="info-row"><span>Usuario:</span><span class="info-val">${u.username}</span></div>
    <div class="info-row"><span>Rol:</span><span class="info-val">${u.role}</span></div>`;
}

// ── Dashboard ──────────────────────────────────────────────
function renderDashboard() {
  const mesasOcup   = Model.mesas.filter(m => ['ocupada','cuenta'].includes(m.estado)).length;
  const pedPend     = Model.pedidos.filter(p => ['nuevo','preparando'].includes(p.estado)).length;
  const ventasHoy   = Model.facturas.reduce((s, f) => s + f.total, 0) + 1245000;
  const alertasN    = Model.inventario.filter(i => i.stock <= i.minimo).length;
  const el = id => document.getElementById(id);
  if (el('kpi-mesas'))   el('kpi-mesas').textContent   = `${mesasOcup} / ${Model.mesas.length}`;
  if (el('kpi-pedidos')) el('kpi-pedidos').textContent = pedPend;
  if (el('kpi-ventas'))  el('kpi-ventas').textContent  = fmt(ventasHoy);
  if (el('kpi-alertas')) {
    el('kpi-alertas').textContent = alertasN;
    el('kpi-alertas').className   = 'kpi-value' + (alertasN > 0 ? ' danger' : ' success');
  }
  // Mesas resumen (dashboard)
  if (el('dash-mesas-grid')) {
    el('dash-mesas-grid').innerHTML = Model.mesas.slice(0, 8).map(m => `
      <div class="mesa-card ${m.estado}" onclick="nav('mesas')" style="cursor:pointer;">
        <div class="mesa-num">${m.id}</div>
        <div class="mesa-estado"><span class="badge badge-${m.estado}">${m.estado}</span></div>
        <div class="mesa-info">${m.mesero || '—'}</div>
      </div>`).join('');
  }
  // Pedidos en curso (dashboard)
  if (el('dash-pedidos-list')) {
    const activos = Model.pedidos.filter(p => ['nuevo','preparando','listo'].includes(p.estado));
    el('dash-pedidos-list').innerHTML = activos.length === 0
      ? '<div class="empty-state">No hay pedidos activos</div>'
      : activos.map(p => `
        <div class="pedido-row">
          <span class="pedido-mesa">${p.mesaId}</span>
          <span class="pedido-items">${p.items.map(i => i.nombre + ' x' + i.qty).join(', ')}</span>
          <span class="pedido-estado"><span class="badge badge-${p.estado}">${p.estado}</span></span>
        </div>`).join('');
  }
  updateNotifBadge();
}

// ── Facturación ────────────────────────────────────────────
function renderFacturacion(mesaId) {
  if (!mesaId) {
    document.getElementById('factura-content').innerHTML = '<div class="empty-state">Seleccione una mesa</div>';
    return;
  }
  const ped = Model.pedidos.filter(p => p.mesaId === mesaId && p.estado !== 'cancelado');
  const itemMap = {};
  ped.forEach(p => p.items.forEach(i => {
    if (!itemMap[i.nombre]) itemMap[i.nombre] = { nombre:i.nombre, precio:i.precio, qty:0 };
    itemMap[i.nombre].qty += i.qty;
  }));
  const items = Object.values(itemMap);
  if (items.length === 0) {
    document.getElementById('factura-content').innerHTML = '<div class="empty-state">No hay ítems para esta mesa</div>';
    return;
  }
  const subtotal = items.reduce((s, i) => s + i.precio * i.qty, 0);
  const propina  = Math.round(subtotal * 0.1);
  const total    = subtotal + propina;
  document.getElementById('factura-title').textContent = `Facturación — Cuenta de ${mesaId}`;
  document.getElementById('factura-content').innerHTML = `
    <div class="factura-layout">
      <div class="factura-detail">
        <h3>Detalle de consumo</h3>
        <table class="tbl">
          <thead><tr><th>Ítem</th><th>Cant.</th><th>P. Unit.</th><th>Total</th></tr></thead>
          <tbody>${items.map(i => `<tr>
            <td>${i.nombre}</td><td>${i.qty}</td>
            <td>${i.precio.toLocaleString('es-CO')}</td>
            <td>${(i.precio * i.qty).toLocaleString('es-CO')}</td>
          </tr>`).join('')}</tbody>
        </table>
        <div class="factura-total" style="margin-top:16px;">
          <div class="factura-row"><span>Subtotal:</span><span>$ ${subtotal.toLocaleString('es-CO')}</span></div>
          <div class="factura-row descuento"><span>Descuento:</span><span id="fact-desc">$ 0</span></div>
          <div class="factura-row propina"><span>Propina sugerida (10%):</span><span>$ ${propina.toLocaleString('es-CO')}</span></div>
          <div class="factura-row total"><span>TOTAL:</span><span id="fact-total">${fmt(total)}</span></div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center;">
          <span style="font-size:12px;color:var(--text-light);">Descuento %:</span>
          <input type="number" id="fact-desc-pct" min="0" max="50" value="0"
            style="width:60px;padding:5px;border:1px solid var(--border);font-size:13px;"
            oninput="Controller.facturacion.aplicarDescuento(${subtotal},${propina})">
          <span style="font-size:12px;color:var(--text-light);">Dividir entre:</span>
          <input type="number" id="fact-dividir" min="1" max="20" value="1"
            style="width:55px;padding:5px;border:1px solid var(--border);font-size:13px;">
          <button class="btn btn-sm btn-secondary" onclick="Controller.facturacion.dividirCuenta(${total})">Calcular</button>
        </div>
      </div>
      <div class="factura-pay">
        <h3>Método de pago</h3>
        <div class="pay-methods">
          ${['Efectivo','Tarjeta débito','Tarjeta crédito','Nequi','Daviplata'].map(m =>
            `<button class="pay-btn" onclick="Controller.facturacion.selectPago(this,'${m}')">${m}</button>`
          ).join('')}
        </div>
        <div id="dividir-result" style="margin-top:12px;font-size:13px;color:var(--text-light);"></div>
        <button class="btn btn-success" id="btn-cobrar"
          style="width:100%;margin-top:16px;justify-content:center;display:none;"
          onclick="Controller.facturacion.cobrar('${mesaId}',${subtotal},${propina})">
          Cobrar ${fmt(total)}
        </button>
      </div>
    </div>`;
}

// ── Cierre de caja ─────────────────────────────────────────
function renderCierre() {
  const efectivo = Model.facturas.filter(f => f.metodoPago === 'Efectivo').reduce((s, f) => s + f.total, 0) + 245000;
  const tarjeta  = Model.facturas.filter(f => f.metodoPago && f.metodoPago.includes('Tarjeta')).reduce((s, f) => s + f.total, 0) + 680000;
  const digital  = Model.facturas.filter(f => ['Nequi','Daviplata'].includes(f.metodoPago)).reduce((s, f) => s + f.total, 0) + 320000;
  const total    = efectivo + tarjeta + digital;
  const el = id => document.getElementById(id);
  if (el('cierre-efectivo')) el('cierre-efectivo').textContent = fmt(efectivo);
  if (el('cierre-tarjeta'))  el('cierre-tarjeta').textContent  = fmt(tarjeta);
  if (el('cierre-digital'))  el('cierre-digital').textContent  = fmt(digital);
  if (el('cierre-total'))    el('cierre-total').textContent    = fmt(total);
  if (el('cierre-facturas')) el('cierre-facturas').textContent = Model.facturas.length + 3;
  if (el('cierre-pedidos'))  el('cierre-pedidos').textContent  = Model.pedidos.length + 8;
}

// ── Lista de espera ────────────────────────────────────────
function renderListaEspera() {
  const c = document.getElementById('lista-espera-content');
  c.innerHTML = Model.listaEspera.length === 0
    ? '<p style="color:var(--text-light);font-size:13px;">Lista de espera vacía.</p>'
    : Model.listaEspera.map((e, i) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
          <span><strong>${e.nombre}</strong> — ${e.personas} personas</span>
          <button class="btn btn-sm btn-danger"
            onclick="Model.listaEspera.splice(${i},1);renderListaEspera()">×</button>
        </div>`).join('');
}

// ── Router: qué renderizar al navegar ─────────────────────
const ViewRouter = {
  onNav(pageId) {
    switch (pageId) {
      case 'dashboard':    renderDashboard();    setTimeout(initCharts, 150); break;
      case 'mesas':        renderMesas('todas'); break;
      case 'menu':         renderMenuTable('',''); break;
      case 'pedidos':      Controller.pedido.init(); break;
      case 'cocina':       renderCocina();  break;
      case 'inventario':   renderInventario('',''); break;
      case 'alertas':      renderAlertas(); break;
      case 'proveedores':  renderProveedores(''); break;
      case 'reservas':     Controller.reservas.init(); renderReservas(); break;
      case 'facturacion':  Controller.facturacion.init(); break;
      case 'caja':         renderCierre(); break;
      case 'auditoria':    renderAuditoria('',''); break;
      case 'usuarios':     renderUsuarios(''); break;
      case 'configuracion':renderConfig(); break;
    }
  },
};
