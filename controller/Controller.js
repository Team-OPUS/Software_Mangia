// ============================================================
//  MANGIA — CONTROLLER (lógica de negocio y manejadores)
// ============================================================

const Controller = {

  // ── Login / sesión ───────────────────────────────────────
  auth: {
    login() {
      const u    = document.getElementById('login-user').value.trim().toLowerCase();
      const p    = document.getElementById('login-pass').value;
      const errEl = document.getElementById('login-error');

      if (Model.loginAttempts[u] >= 5) {
        errEl.textContent = 'Cuenta bloqueada temporalmente. Contacte al administrador.';
        errEl.style.display = 'block'; return;
      }

      const user = Model.users.find(x => x.username === u && x.status === 'activo');
      if (!user || user.pass !== p) {
        Model.loginAttempts[u] = (Model.loginAttempts[u] || 0) + 1;
        const rem = 5 - (Model.loginAttempts[u] || 0);
        errEl.textContent = `Credenciales incorrectas. Intentos restantes: ${rem > 0 ? rem : 0}`;
        errEl.style.display = 'block';
        logAudit('Intento fallido', 'Sesión', `Login fallido para usuario "${u}"`);
        return;
      }

      Model.loginAttempts[u] = 0;
      Model.currentUser = user;
      errEl.style.display = 'none';

      document.getElementById('user-name-display').textContent = user.name;
      document.getElementById('user-role-display').textContent = user.role;
      document.getElementById('user-avatar').textContent       = user.initials;

      buildNav(user.role);
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('app').classList.add('visible');

      logAudit('Inicio de sesión', 'Sesión', 'Login exitoso');
      nav(user.role === 'Cocinero' ? 'cocina' : 'dashboard');
      startClock();
      setTimeout(initCharts, 150);
      this._initOfflineMode();
      this._initInactivityWatch();
    },

    logout() {
      logAudit('Cierre de sesión', 'Sesión', 'Sesión cerrada');
      clearTimeout(this._inactivityTimer);
      clearTimeout(this._inactivityWarningTimer);
      Model.currentUser = null;
      Model.orderItems  = [];
      document.getElementById('app').classList.remove('visible');
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('login-pass').value = '';
      const banner = document.getElementById('offline-banner');
      if (banner) banner.style.display = 'none';
    },

    // ── Recuperar contraseña ──────────────────────────────
    solicitarRecuperacion() {
      const val = document.getElementById('forgot-input').value.trim();
      if (!val) { toast('Ingrese su usuario o correo', 'error'); return; }
      const u = Model.users.find(x => x.username === val || x.email === val);
      closeModal('modal-forgot');
      toast(u
        ? `Solicitud enviada. El administrador restablecerá la contraseña de "${u.name}"`
        : 'Usuario o correo no encontrado', u ? 'success' : 'error');
    },

    // ── Inactividad ───────────────────────────────────────
    _inactivityTimer:        null,
    _inactivityWarningTimer: null,
    INACTIVITY_TIMEOUT:      15 * 60 * 1000,

    _resetInactivityTimer() {
      clearTimeout(this._inactivityTimer);
      clearTimeout(this._inactivityWarningTimer);
      if (!Model.currentUser) return;
      this._inactivityWarningTimer = setTimeout(() => {
        if (Model.currentUser) toast('Sesión: 1 minuto para cierre automático por inactividad', 'warning');
      }, this.INACTIVITY_TIMEOUT - 60000);
      this._inactivityTimer = setTimeout(() => {
        if (Model.currentUser) {
          logAudit('Cierre automático', 'Sesión', 'Sesión cerrada por inactividad (15 min)');
          toast('Sesión cerrada por inactividad', 'warning');
          Controller.auth.logout();
        }
      }, this.INACTIVITY_TIMEOUT);
    },

    _initInactivityWatch() {
      ['mousemove','keydown','click','touchstart','scroll'].forEach(ev => {
        document.addEventListener(ev, () => Controller.auth._resetInactivityTimer(), { passive:true });
      });
      this._resetInactivityTimer();
    },

    // ── Offline ───────────────────────────────────────────
    _initOfflineMode() {
      const update = () => {
        Model.isOnline = navigator.onLine;
        const banner = document.getElementById('offline-banner');
        if (!banner) return;
        if (!Model.isOnline) {
          banner.style.display = 'block';
          this._updateOfflinePendingCount();
        } else {
          banner.style.display = 'none';
          if (Model.offlineQueue.length > 0) this._retryOfflineQueue();
        }
      };
      window.addEventListener('online',  update);
      window.addEventListener('offline', update);
      update();
    },

    _updateOfflinePendingCount() {
      const el = document.getElementById('offline-pending-count');
      if (el && Model.offlineQueue.length > 0)
        el.textContent = '(' + Model.offlineQueue.length + ' pedido' + (Model.offlineQueue.length > 1 ? 's' : '') + ' en cola)';
      else if (el) el.textContent = '';
    },

    _retryOfflineQueue() {
      if (Model.offlineQueue.length === 0) return;
      const queue = [...Model.offlineQueue];
      Model.offlineQueue = [];
      queue.forEach(pedido => {
        Model.pedidos.push(pedido);
        logAudit('Pedido enviado (offline)', 'Pedidos', `Pedido #${pedido.id} re-enviado al restablecer conexión`);
      });
      toast(`${queue.length} pedido(s) en cola enviados a cocina ✓`, 'success');
      this._updateOfflinePendingCount();
    },
  },

  // ── Mesas ────────────────────────────────────────────────
  mesa: {
    click(mesaId) {
      const mesa = Model.findMesa(mesaId);
      if (!mesa) return;
      if (mesa.estado === 'libre') {
        Model.pedidoMesaId = mesaId;
        nav('pedidos');
      } else if (['ocupada','cuenta'].includes(mesa.estado)) {
        // Mostrar modal detalle mesa
        document.getElementById('modal-mesa-title').textContent = `Mesa ${mesaId}`;
        document.getElementById('modal-mesa-body').innerHTML = `
          <p><strong>Estado:</strong> ${mesa.estado}</p>
          <p><strong>Mesero:</strong> ${mesa.mesero || '—'}</p>
          <p><strong>Comensales:</strong> ${mesa.comensales}</p>
          <p><strong>Desde:</strong> ${mesa.horaApertura || '—'}</p>
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button class="btn btn-primary" onclick="Model.pedidoMesaId='${mesaId}';nav('pedidos');closeModal('modal-mesa')">+ Agregar pedido</button>
            <button class="btn btn-secondary" onclick="nav('facturacion');closeModal('modal-mesa')">Facturar</button>
          </div>`;
        openModal('modal-mesa');
      }
    },

    abrirCombinar(mesaId) {
      document.getElementById('combinar-origen').textContent = mesaId;
      const sel = document.getElementById('combinar-destino-select');
      sel.innerHTML = Model.mesas
        .filter(m => m.id !== mesaId && m.estado === 'ocupada')
        .map(m => `<option value="${m.id}">${m.id} — ${m.mesero}</option>`).join('');
      document.getElementById('combinar-mesa-id').value = mesaId;
      openModal('modal-combinar');
    },

    confirmarCombinar() {
      const origenId = document.getElementById('combinar-mesa-id').value;
      const destId   = document.getElementById('combinar-destino-select').value;
      if (!destId) { toast('Seleccione una mesa destino', 'error'); return; }
      const origen = Model.findMesa(origenId);
      const dest   = Model.findMesa(destId);
      if (!origen || !dest) return;
      dest.comensales += origen.comensales;
      Model.pedidos.filter(p => p.mesaId === origenId).forEach(p => p.mesaId = destId);
      origen.estado = 'libre'; origen.mesero = null; origen.comensales = 0; origen.horaApertura = null;
      logAudit('Mesas combinadas', 'Mesas', `${destId} combinada con ${origenId}`);
      closeModal('modal-combinar');
      toast(`Mesa ${destId} combinada con ${origenId} ✓`, 'success');
      renderMesas('todas');
    },
  },

  // ── Menú ─────────────────────────────────────────────────
  menu: {
    openModal(id = null) {
      Model.editingId = id;
      document.getElementById('modal-plato-title').textContent = id ? 'Editar Plato' : 'Nuevo Plato';
      if (id) {
        const p = Model.findPlato(id);
        document.getElementById('plato-id').value        = id;
        document.getElementById('plato-nombre').value    = p.nombre;
        document.getElementById('plato-cat').value       = p.cat;
        document.getElementById('plato-precio').value    = p.precio;
        document.getElementById('plato-desc').value      = p.desc || '';
        document.getElementById('plato-tiempo').value    = p.tiempo || '';
        document.getElementById('plato-disponible').value= p.disponible ? '1' : '0';
        const imgUrl = p.img || '';
        document.getElementById('plato-img-url').value   = imgUrl;
        document.getElementById('plato-img-preview').innerHTML = imgUrl
          ? `<img src="${imgUrl}" style="max-width:200px;max-height:120px;border:1px solid var(--border);margin-top:4px;" alt="Vista previa">` : '';
      } else {
        ['plato-nombre','plato-precio','plato-desc','plato-tiempo','plato-img-url'].forEach(f => document.getElementById(f).value = '');
        document.getElementById('plato-disponible').value = '1';
        document.getElementById('plato-img-preview').innerHTML = '';
      }
      openModal('modal-plato');
    },

    save() {
      const nombre = document.getElementById('plato-nombre').value.trim();
      const precio = parseFloat(document.getElementById('plato-precio').value);
      if (!nombre || !precio) { toast('Complete nombre y precio', 'error'); return; }
      const data = {
        nombre, cat: document.getElementById('plato-cat').value,
        precio,  desc: document.getElementById('plato-desc').value,
        tiempo:  document.getElementById('plato-tiempo').value,
        disponible: document.getElementById('plato-disponible').value === '1',
        img: document.getElementById('plato-img-url')?.value || '',
      };
      if (Model.editingId) {
        const idx = Model.menu.findIndex(x => x.id === Model.editingId);
        Model.menu[idx] = { ...Model.menu[idx], ...data };
        logAudit('Modificación', 'Menú', `Plato "${nombre}" actualizado`);
        toast(`Plato "${nombre}" actualizado`);
      } else {
        const newId = Math.max(...Model.menu.map(x => x.id)) + 1;
        Model.menu.push({ id: newId, ...data });
        logAudit('Creación', 'Menú', `Plato "${nombre}" creado — $${precio}`);
        toast(`Plato "${nombre}" creado`, 'success');
      }
      closeModal('modal-plato'); renderMenuTable('',''); Model.editingId = null;
    },

    toggleEstado(id) {
      const p = Model.findPlato(id);
      p.disponible = !p.disponible;
      logAudit('Modificación', 'Menú', `Plato "${p.nombre}" ${p.disponible ? 'activado' : 'desactivado'}`);
      toast(`"${p.nombre}" ${p.disponible ? 'activado' : 'desactivado'}`);
      renderMenuTable('','');
    },

    delete(id) {
      const p = Model.findPlato(id);
      confirmAction('Eliminar plato', `¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`, () => {
        Model.menu = Model.menu.filter(x => x.id !== id);
        logAudit('Eliminación', 'Menú', `Plato "${p.nombre}" eliminado`);
        toast(`"${p.nombre}" eliminado`, 'warning');
        renderMenuTable('','');
      });
    },

    handleImageFile(input) {
      const file = input.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { toast('Solo se admiten archivos de imagen', 'error'); return; }
      if (file.size > 5 * 1024 * 1024)    { toast('La imagen no debe superar 5 MB', 'error');       return; }
      const reader = new FileReader();
      reader.onload = e => {
        document.getElementById('plato-img-url').value = e.target.result;
        document.getElementById('plato-img-preview').innerHTML =
          `<img src="${e.target.result}" style="max-width:200px;max-height:120px;border:1px solid var(--border);margin-top:4px;" alt="Vista previa">`;
      };
      reader.readAsDataURL(file);
    },
  },

  // ── Pedidos ───────────────────────────────────────────────
  pedido: {
    init() {
      const sel = document.getElementById('mesa-select');
      sel.innerHTML = `<option value="">— Seleccionar mesa —</option>` +
        Model.mesas.map(m => `<option value="${m.id}" ${m.id === Model.pedidoMesaId ? 'selected' : ''}>${m.id} — ${m.estado}</option>`).join('');
      Model.orderItems = [];
      renderMenuItems('');
      renderOrder();
      if (Model.pedidoMesaId) this.cambiarMesa(Model.pedidoMesaId);
    },

    cambiarMesa(id) {
      Model.pedidoMesaId = id;
      document.getElementById('pedido-title').textContent     = id ? `Toma de Pedido — ${id}` : 'Toma de Pedido';
      document.getElementById('pedido-sub').textContent       = id ? `Mesero: ${Model.currentUser.name}` : 'Seleccione una mesa';
      document.getElementById('order-mesa-label').textContent = id ? `Pedido (${id})` : 'Pedido';
    },

    addItem(id) {
      const item = Model.findPlato(id);
      const ex   = Model.orderItems.find(i => i.id === id);
      if (ex) ex.qty++; else Model.orderItems.push({ ...item, qty:1 });
      renderOrder();
    },

    changeQty(id, delta) {
      const idx = Model.orderItems.findIndex(i => i.id === id);
      if (idx < 0) return;
      Model.orderItems[idx].qty += delta;
      if (Model.orderItems[idx].qty <= 0) Model.orderItems.splice(idx, 1);
      renderOrder();
    },

    clear() {
      Model.orderItems = [];
      renderOrder();
      document.getElementById('order-obs').value = '';
    },

    send() {
      if (!Model.orderItems.length)  { toast('Agrega al menos un ítem', 'error'); return; }
      if (!Model.pedidoMesaId)       { toast('Seleccione una mesa', 'error');      return; }
      const obs   = document.getElementById('order-obs').value;
      const id    = genId();
      const total = Model.orderItems.reduce((s, i) => s + i.precio * i.qty, 0);
      const pedido = {
        id, mesaId: Model.pedidoMesaId, mesero: Model.currentUser.name,
        items: Model.orderItems.map(i => ({ id:i.id, nombre:i.nombre, qty:i.qty, precio:i.precio })),
        obs, estado:'nuevo', hora:now(), fecha:today(), total,
      };
      // Actualizar estado mesa
      const mesa = Model.findMesa(Model.pedidoMesaId);
      if (mesa && mesa.estado === 'libre') {
        mesa.estado = 'ocupada'; mesa.mesero = Model.currentUser.name; mesa.horaApertura = now();
      }
      // Soporte offline
      if (!Model.isOnline) {
        Model.offlineQueue.push(pedido);
        Controller.auth._updateOfflinePendingCount();
        logAudit('Pedido en cola offline', 'Pedidos', `Pedido #${id} guardado — sin conexión`);
        toast(`Sin conexión — Pedido #${id} guardado. Se enviará al restablecerse la red.`, 'warning');
        this.clear(); Model.pedidoMesaId = null; return;
      }
      Model.pedidos.push(pedido);
      // Descontar inventario
      this._deducirInventario(Model.orderItems);
      // Verificar alertas
      this._checkAlertas();
      logAudit('Pedido enviado', 'Pedidos', `Pedido #${id} para ${Model.pedidoMesaId} — ${fmt(total)}`);
      this.clear(); Model.pedidoMesaId = null;
      toast(`Pedido #${id} enviado a cocina ✓`, 'success');
      nav('cocina');
    },

    _deducirInventario(items) {
      const sinReceta = [];
      items.forEach(item => {
        const receta = Model.recetas[item.id];
        if (!receta || receta.length === 0) {
          sinReceta.push(item.nombre);
          logAudit('Alerta inventario', 'Inventario', `Ítem "${item.nombre}" sin receta — no se pudo descontar`);
        } else {
          receta.forEach(r => {
            const ins = Model.findInsumo(r.insumoId);
            if (ins) ins.stock = Math.max(0, ins.stock - r.qty * item.qty);
          });
        }
      });
      if (sinReceta.length > 0) {
        document.getElementById('sin-receta-list').innerHTML = `
          <div style="background:#fff3e0;border:1px solid var(--warning);padding:12px;font-size:13px;">
            <strong>Ítems sin receta detectados:</strong><br>
            <ul style="margin:8px 0 0 16px;">${sinReceta.map(n => `<li>${n}</li>`).join('')}</ul>
          </div>`;
        setTimeout(() => openModal('modal-sin-receta'), 400);
      }
    },

    _checkAlertas() {
      Model.inventario.forEach(i => {
        if (i.stock <= i.minimo) {
          const ya = Model.auditLog.find(l =>
            l.modulo === 'Inventario' && l.detalle.includes(i.nombre) && l.fecha === today());
          if (!ya) logAudit('Alerta generada', 'Inventario',
            `Stock crítico: ${i.nombre} — ${i.stock} ${i.unidad} (mín: ${i.minimo})`);
        }
      });
      updateNotifBadge();
    },

    filterMenu(cat, btn) {
      document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      renderMenuItems(cat);
    },
  },

  // ── Cocina ────────────────────────────────────────────────
  cocina: {
    moverTicket(pedidoId, nuevoEstado) {
      const p = Model.findPedido(pedidoId);
      if (!p) return;
      p.estado = nuevoEstado;
      if (nuevoEstado === 'listo') {
        const mesa = Model.findMesa(p.mesaId);
        if (mesa) mesa.estado = 'cuenta';
        logAudit('Pedido listo', 'Pedidos', `Pedido #${pedidoId} — ${p.mesaId} listo para servir`);
        toast(`Pedido #${pedidoId} listo — ${p.mesaId} notificada`, 'success');
      } else {
        logAudit('Estado actualizado', 'Pedidos', `Pedido #${pedidoId} → ${nuevoEstado}`);
      }
      renderCocina();
    },

    marcarServido(pedidoId) {
      const p = Model.findPedido(pedidoId);
      if (!p) return;
      p.estado = 'servido';
      logAudit('Pedido servido', 'Pedidos', `Pedido #${pedidoId} marcado como servido`);
      toast(`Pedido #${pedidoId} servido ✓`, 'success');
      renderCocina();
    },
  },

  // ── Modificar pedido ──────────────────────────────────────
  modificar: {
    abrir(pedidoId) {
      Model.modificarPedidoId = pedidoId;
      const p = Model.findPedido(pedidoId);
      if (!p) { toast('Pedido no encontrado', 'error'); return; }
      document.getElementById('modificar-title').textContent = `Modificar Pedido #${p.id} — ${p.mesaId}`;
      document.getElementById('modif-items-list').innerHTML =
        `<h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">Ítems del pedido</h3>` +
        p.items.map(i => `
          <div class="modif-item">
            <div class="modif-item-header"><span>${i.nombre}</span><span>${fmt(i.precio * i.qty)}</span></div>
            <div class="modif-item-detail">x${i.qty} &nbsp; <span style="color:var(--warning);">⚡ En cocina</span></div>
          </div>`).join('');
      nav('modificar');
    },

    confirmar() {
      const motivo = document.getElementById('modif-motivo').value.trim();
      if (!motivo) { toast('Ingrese el motivo del cambio', 'error'); return; }
      const tipo = document.querySelector('input[name="modif-tipo"]:checked')?.value || 'modificar';
      const p    = Model.findPedido(Model.modificarPedidoId);
      if (!p) return;

      if (tipo === 'cancelar' && p.estado === 'listo' && Model.currentUser.role !== 'Administrador') {
        document.getElementById('aprobar-cancel-msg').innerHTML =
          `El pedido <strong>#${p.id}</strong> ya fue marcado como <strong>Listo</strong> por cocina. La cancelación requiere aprobación de un administrador.`;
        document.getElementById('aprobar-admin-user').value      = '';
        document.getElementById('aprobar-admin-pass').value      = '';
        document.getElementById('aprobar-cancel-motivo').value   = motivo;
        openModal('modal-aprobar-cancel');
        return;
      }

      if (tipo === 'cancelar') {
        p.estado = 'cancelado';
        logAudit('Cancelación', 'Pedidos', `Pedido #${p.id} cancelado — ${motivo}`);
        toast(`Pedido #${p.id} cancelado`, 'warning');
      } else if (tipo === 'mesa') {
        logAudit('Cambio de mesa', 'Pedidos', `Pedido #${p.id} — cambio de mesa — ${motivo}`);
        toast(`Cambio de mesa registrado para pedido #${p.id}`, 'success');
      } else {
        logAudit('Modificación', 'Pedidos', `Pedido #${p.id} modificado — ${motivo}`);
        toast(`Pedido #${p.id} modificado ✓`, 'success');
      }
      nav('cocina');
    },

    aprobarAdmin() {
      const u    = document.getElementById('aprobar-admin-user').value.trim();
      const p    = document.getElementById('aprobar-admin-pass').value;
      const user = Model.users.find(x => x.username === u && x.role === 'Administrador' && x.pass === p && x.status === 'activo');
      if (!user) { toast('Credenciales de administrador incorrectas', 'error'); return; }
      const pedido = Model.findPedido(Model.modificarPedidoId);
      const motivo = document.getElementById('aprobar-cancel-motivo').value;
      if (pedido) { pedido.estado = 'cancelado'; }
      logAudit('Cancelación aprobada', 'Pedidos', `Pedido #${Model.modificarPedidoId} cancelado con autorización de ${u} — ${motivo}`);
      closeModal('modal-aprobar-cancel');
      toast(`Pedido cancelado con autorización de ${user.name}`, 'warning');
      nav('cocina');
    },
  },

  // ── Inventario ────────────────────────────────────────────
  inventario: {
    openModal(id = null) {
      Model.editingId = id;
      document.getElementById('modal-insumo-title').textContent = id ? 'Editar Insumo' : 'Nuevo Insumo';
      const provSel = document.getElementById('insumo-proveedor');
      provSel.innerHTML = `<option value="">Sin proveedor</option>` +
        Model.proveedores.filter(p => p.status === 'activo')
          .map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
      if (id) {
        const ins = Model.findInsumo(id);
        document.getElementById('insumo-id').value      = id;
        document.getElementById('insumo-nombre').value  = ins.nombre;
        document.getElementById('insumo-unidad').value  = ins.unidad;
        document.getElementById('insumo-stock').value   = ins.stock;
        document.getElementById('insumo-minimo').value  = ins.minimo;
        provSel.value = ins.proveedorId || '';
      } else {
        ['insumo-nombre','insumo-stock','insumo-minimo'].forEach(f => document.getElementById(f).value = '');
      }
      openModal('modal-insumo');
    },

    save() {
      const nombre = document.getElementById('insumo-nombre').value.trim();
      const stock  = parseFloat(document.getElementById('insumo-stock').value);
      const minimo = parseFloat(document.getElementById('insumo-minimo').value);
      if (!nombre || isNaN(stock) || isNaN(minimo)) { toast('Complete todos los campos requeridos', 'error'); return; }
      const data = {
        nombre, unidad: document.getElementById('insumo-unidad').value,
        stock, minimo, proveedorId: parseInt(document.getElementById('insumo-proveedor').value) || null,
      };
      if (Model.editingId) {
        const idx = Model.inventario.findIndex(x => x.id === Model.editingId);
        Model.inventario[idx] = { ...Model.inventario[idx], ...data };
        logAudit('Modificación', 'Inventario', `Insumo "${nombre}" actualizado — stock: ${stock}`);
        toast(`"${nombre}" actualizado`);
      } else {
        const newId = Math.max(...Model.inventario.map(x => x.id)) + 1;
        Model.inventario.push({ id: newId, ...data });
        logAudit('Creación', 'Inventario', `Insumo "${nombre}" registrado — stock inicial: ${stock}`);
        toast(`"${nombre}" registrado`, 'success');
      }
      closeModal('modal-insumo');
      renderInventario('','');
      Controller.pedido._checkAlertas();
      Model.editingId = null;
    },

    delete(id) {
      const ins = Model.findInsumo(id);
      confirmAction('Eliminar insumo', `¿Eliminar "${ins.nombre}"?`, () => {
        Model.inventario = Model.inventario.filter(x => x.id !== id);
        logAudit('Eliminación', 'Inventario', `Insumo "${ins.nombre}" eliminado`);
        toast(`"${ins.nombre}" eliminado`, 'warning');
        renderInventario('','');
      });
    },

    openAjuste(id) {
      const ins = Model.findInsumo(id);
      document.getElementById('ajuste-id').value = id;
      document.getElementById('ajuste-nombre').textContent = `${ins.nombre} (stock actual: ${ins.stock} ${ins.unidad})`;
      document.getElementById('ajuste-cantidad').value = '';
      document.getElementById('ajuste-motivo').value   = '';
      openModal('modal-ajuste');
    },

    confirmarAjuste() {
      const id       = parseInt(document.getElementById('ajuste-id').value);
      const tipo     = document.getElementById('ajuste-tipo').value;
      const cantidad = parseFloat(document.getElementById('ajuste-cantidad').value);
      const motivo   = document.getElementById('ajuste-motivo').value.trim();
      if (!cantidad || !motivo) { toast('Complete cantidad y motivo', 'error'); return; }
      const ins = Model.findInsumo(id);
      if (tipo === 'entrada')    ins.stock += cantidad;
      else if (tipo === 'merma') ins.stock = Math.max(0, ins.stock - cantidad);
      else                       ins.stock = cantidad;
      logAudit('Ajuste de stock', 'Inventario', `${ins.nombre}: ${tipo} de ${cantidad} ${ins.unidad} — ${motivo}`);
      Controller.pedido._checkAlertas();
      closeModal('modal-ajuste');
      renderInventario('','');
      toast(`Ajuste aplicado — ${ins.nombre}: ${ins.stock} ${ins.unidad}`, 'success');
    },
  },

  // ── Alertas ───────────────────────────────────────────────
  alertas: {
    marcarAtendidas() {
      logAudit('Alertas atendidas', 'Inventario', `Alertas marcadas como atendidas por ${Model.currentUser.name}`);
      toast('Alertas marcadas como atendidas');
    },
    notificarAdmin() {
      const criticos = Model.inventario.filter(i => i.stock <= i.minimo);
      if (criticos.length === 0) { toast('No hay alertas críticas para enviar', 'error'); return; }
      logAudit('Alerta por correo', 'Inventario', `Alerta enviada al administrador: ${criticos.length} insumos críticos`);
      toast(`Alerta de stock enviada al administrador (${criticos.length} insumo${criticos.length > 1 ? 's' : ''})`, 'success');
    },
    generarPedido() {
      logAudit('Pedido a proveedor', 'Inventario', 'Pedido de reabastecimiento generado para insumos críticos');
      toast('Pedido a proveedores generado y registrado ✓', 'success');
    },
  },

  // ── Proveedores ───────────────────────────────────────────
  proveedores: {
    openModal(id = null) {
      Model.editingId = id;
      document.getElementById('modal-prov-title').textContent = id ? 'Editar Proveedor' : 'Nuevo Proveedor';
      if (id) {
        const p = Model.findProveedor(id);
        document.getElementById('prov-id').value       = id;
        document.getElementById('prov-nombre').value   = p.nombre;
        document.getElementById('prov-tel').value      = p.tel;
        document.getElementById('prov-email').value    = p.email || '';
        document.getElementById('prov-productos').value= p.productos;
        document.getElementById('prov-pago').value     = p.condPago;
        document.getElementById('prov-dir').value      = p.dir || '';
      } else {
        ['prov-nombre','prov-tel','prov-email','prov-productos','prov-dir'].forEach(f => document.getElementById(f).value = '');
      }
      openModal('modal-proveedor');
    },

    save() {
      const nombre = document.getElementById('prov-nombre').value.trim();
      if (!nombre) { toast('El nombre es requerido', 'error'); return; }
      const data = {
        nombre, tel:      document.getElementById('prov-tel').value,
        email:            document.getElementById('prov-email').value,
        productos:        document.getElementById('prov-productos').value,
        condPago:         document.getElementById('prov-pago').value,
        dir:              document.getElementById('prov-dir').value,
        status: 'activo',
      };
      if (Model.editingId) {
        const idx = Model.proveedores.findIndex(x => x.id === Model.editingId);
        Model.proveedores[idx] = { ...Model.proveedores[idx], ...data };
        logAudit('Modificación', 'Proveedores', `Proveedor "${nombre}" actualizado`);
        toast(`"${nombre}" actualizado`);
      } else {
        const newId = Math.max(...Model.proveedores.map(x => x.id)) + 1;
        Model.proveedores.push({ id: newId, ...data });
        logAudit('Creación', 'Proveedores', `Proveedor "${nombre}" registrado`);
        toast(`"${nombre}" registrado`, 'success');
      }
      closeModal('modal-proveedor'); renderProveedores(''); Model.editingId = null;
    },

    delete(id) {
      const p = Model.findProveedor(id);
      confirmAction('Eliminar proveedor', `¿Eliminar "${p.nombre}"?`, () => {
        p.status = 'inactivo';
        logAudit('Eliminación', 'Proveedores', `Proveedor "${p.nombre}" desactivado`);
        toast(`"${p.nombre}" desactivado`, 'warning');
        renderProveedores('');
      });
    },
  },

  // ── Reservas ──────────────────────────────────────────────
  reservas: {
    init() {
      const fechaEl = document.getElementById('res-fecha-filter');
      if (!fechaEl.value) fechaEl.value = today();
      const resMesa = document.getElementById('res-mesa');
      resMesa.innerHTML = `<option value="">Sin preferencia</option>` +
        Model.mesas.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
    },

    openModal(id = null) {
      Model.editingId = id;
      document.getElementById('modal-reserva-title').textContent = id ? 'Editar Reserva' : 'Nueva Reserva';
      const resMesa = document.getElementById('res-mesa');
      resMesa.innerHTML = `<option value="">Sin preferencia</option>` +
        Model.mesas.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
      if (id) {
        const r = Model.reservas.find(x => x.id === id);
        document.getElementById('reserva-id').value   = id;
        document.getElementById('res-cliente').value  = r.cliente;
        document.getElementById('res-fecha').value    = r.fecha;
        document.getElementById('res-hora').value     = r.hora;
        document.getElementById('res-personas').value = r.personas;
        document.getElementById('res-tel').value      = r.tel;
        resMesa.value = r.mesa || '';
        document.getElementById('res-obs').value = r.obs || '';
      } else {
        document.getElementById('res-fecha').value = today();
        ['res-cliente','res-tel','res-obs'].forEach(f => document.getElementById(f).value = '');
        document.getElementById('res-personas').value = '4';
      }
      openModal('modal-reserva');
    },

    save() {
      const cliente = document.getElementById('res-cliente').value.trim();
      const fecha   = document.getElementById('res-fecha').value;
      if (!cliente || !fecha) { toast('Cliente y fecha son requeridos', 'error'); return; }
      const hora           = document.getElementById('res-hora').value;
      const mesaSolicitada = document.getElementById('res-mesa').value;
      const data = {
        cliente, fecha, hora,
        personas: document.getElementById('res-personas').value,
        tel:      document.getElementById('res-tel').value,
        mesa:     mesaSolicitada,
        obs:      document.getElementById('res-obs').value,
        estado:   'confirmada',
      };

      // RF-08: verificar conflicto de horario (±90 min)
      if (mesaSolicitada && !Model.editingId) {
        const [hh, mm] = hora.split(':').map(Number);
        const minSol = hh * 60 + mm;
        const conflicto = Model.reservas.find(r => {
          if (r.estado === 'cancelada' || r.mesa !== mesaSolicitada || r.fecha !== fecha) return false;
          const [rh, rm] = r.hora.split(':').map(Number);
          return Math.abs(rh * 60 + rm - minSol) < 90;
        });
        if (conflicto) {
          const alts = Model.mesas
            .filter(m => m.id !== mesaSolicitada)
            .filter(m => !Model.reservas.find(r =>
              r.mesa === m.id && r.fecha === fecha && r.estado !== 'cancelada' &&
              Math.abs(parseInt(r.hora) - parseInt(hora)) < 90))
            .slice(0, 4);
          document.getElementById('conflicto-detail').innerHTML =
            `<strong>La mesa ${mesaSolicitada} ya tiene reserva de "${conflicto.cliente}" a las ${conflicto.hora} el ${fecha}.</strong><br>Seleccione una mesa alternativa o cambie el horario.`;
          document.getElementById('conflicto-alternativas').innerHTML = alts.length === 0
            ? '<p style="color:var(--text-light);font-size:13px;">No hay mesas alternativas disponibles en esa franja.</p>'
            : alts.map(m => `<button class="btn btn-secondary" style="margin:4px;" onclick="Controller.reservas.seleccionarAlternativa('${m.id}')">${m.id} — disponible</button>`).join('');
          Model._pendingReservaData = data;
          openModal('modal-reserva-conflicto');
          return;
        }
      }
      this._guardar(data);
    },

    seleccionarAlternativa(mesaId) {
      if (Model._pendingReservaData) {
        Model._pendingReservaData.mesa = mesaId;
        closeModal('modal-reserva-conflicto');
        this._guardar(Model._pendingReservaData);
        Model._pendingReservaData = null;
      }
    },

    _guardar(data) {
      if (Model.editingId) {
        const idx = Model.reservas.findIndex(x => x.id === Model.editingId);
        Model.reservas[idx] = { ...Model.reservas[idx], ...data };
        logAudit('Modificación', 'Reservas', `Reserva de "${data.cliente}" actualizada`);
        toast(`Reserva de "${data.cliente}" actualizada`);
      } else {
        const newId = genId();
        Model.reservas.push({ id: newId, ...data });
        if (data.mesa && data.fecha === today()) {
          const m = Model.findMesa(data.mesa);
          if (m && m.estado === 'libre') m.estado = 'reservada';
        }
        logAudit('Creación', 'Reservas', `Reserva de "${data.cliente}" para ${data.fecha} ${data.hora}`);
        toast(`Reserva de "${data.cliente}" confirmada ✓`, 'success');
      }
      closeModal('modal-reserva');
      closeModal('modal-reserva-conflicto');
      renderReservas();
      Model.editingId = null;
    },

    cancelar(id) {
      const r = Model.reservas.find(x => x.id === id);
      confirmAction('Cancelar reserva', `¿Cancelar reserva de "${r.cliente}"?`, () => {
        r.estado = 'cancelada';
        logAudit('Cancelación', 'Reservas', `Reserva de "${r.cliente}" cancelada`);
        toast(`Reserva de "${r.cliente}" cancelada`, 'warning');
        renderReservas();
      });
    },
  },

  // ── Facturación ───────────────────────────────────────────
  facturacion: {
    _metodoPago: null,

    init() {
      const sel = document.getElementById('factura-mesa-select');
      const mesas = Model.mesas.filter(m => ['ocupada','cuenta'].includes(m.estado));
      sel.innerHTML = `<option value="">— Seleccionar mesa —</option>` +
        mesas.map(m => `<option value="${m.id}">${m.id} (${m.estado})</option>`).join('');
    },

    selectPago(btn, metodo) {
      document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      this._metodoPago = metodo;
      const cobrarBtn = document.getElementById('btn-cobrar');
      if (cobrarBtn) cobrarBtn.style.display = 'block';
    },

    aplicarDescuento(subtotal, propina) {
      const pct      = parseFloat(document.getElementById('fact-desc-pct').value) || 0;
      const desc     = Math.round(subtotal * pct / 100);
      const total    = subtotal - desc + propina;
      document.getElementById('fact-desc').textContent  = `$ -${desc.toLocaleString('es-CO')}`;
      document.getElementById('fact-total').textContent = fmt(total);
      const cobrarBtn = document.getElementById('btn-cobrar');
      if (cobrarBtn) cobrarBtn.textContent = `Cobrar ${fmt(total)}`;
    },

    dividirCuenta(total) {
      const n = parseInt(document.getElementById('fact-dividir').value) || 1;
      const por = Math.ceil(total / n);
      document.getElementById('dividir-result').innerHTML =
        `${n} persona${n > 1 ? 's' : ''}: <strong>${fmt(por)}</strong> c/u`;
    },

    cobrar(mesaId, subtotal, propina) {
      if (!this._metodoPago) { toast('Seleccione un método de pago', 'error'); return; }
      const pct     = parseFloat(document.getElementById('fact-desc-pct')?.value) || 0;
      const desc    = Math.round(subtotal * pct / 100);
      const total   = subtotal - desc + propina;
      const factId  = `F-${String(genId()).padStart(3,'0')}`;
      const ped     = Model.pedidos.filter(p => p.mesaId === mesaId && p.estado !== 'cancelado');
      const items   = [];
      ped.forEach(p => p.items.forEach(i => items.push({ nombre:i.nombre, qty:i.qty, precio:i.precio })));
      const factura = {
        id: factId, mesaId, items, subtotal, descuento: desc, propina, total,
        metodoPago: this._metodoPago,
        mesero: Model.currentUser.name,
        cajero: Model.currentUser.role === 'Cajero' ? Model.currentUser.name : 'Cajero Sistema',
        hora: now(), fecha: today(),
      };
      Model.facturas.push(factura);
      Model.lastFactura = factura;
      // Liberar mesa
      const mesa = Model.findMesa(mesaId);
      if (mesa) { mesa.estado='libre'; mesa.mesero=null; mesa.comensales=0; mesa.horaApertura=null; }
      // Marcar pedidos pagados
      ped.forEach(p => p.estado = 'pagado');
      logAudit('Factura emitida', 'Facturación', `Factura ${factId} por ${fmt(total)} — ${this._metodoPago}`);
      toast(`Factura ${factId} emitida ✓`, 'success');
      this._metodoPago = null;
      nav('factura-pdf');
      this._renderFacturaPDF(factura);
    },

    _renderFacturaPDF(f) {
      const el = document.getElementById('factura-pdf-content');
      if (!el) return;
      const subtot = f.items.reduce((s, i) => s + i.precio * i.qty, 0);
      el.innerHTML = `
        <div style="max-width:400px;margin:0 auto;font-family:'DM Sans',sans-serif;font-size:13px;">
          <div style="text-align:center;margin-bottom:16px;">
            <div style="font-family:'DM Serif Display',serif;font-size:20px;">Restaurante Mangia</div>
            <div style="font-size:11px;color:#888;">Comprobante de pago — ${f.id}</div>
            <div style="font-size:11px;color:#888;">${f.fecha} ${f.hora}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr><th style="text-align:left;padding:4px 0;border-bottom:1px solid #ddd;">Ítem</th><th>Cant.</th><th style="text-align:right;">Total</th></tr></thead>
            <tbody>${f.items.map(i => `<tr><td style="padding:4px 0;">${i.nombre}</td><td style="text-align:center;">${i.qty}</td><td style="text-align:right;">${(i.precio*i.qty).toLocaleString('es-CO')}</td></tr>`).join('')}</tbody>
          </table>
          <div style="border-top:1px solid #ddd;margin-top:10px;padding-top:10px;">
            <div style="display:flex;justify-content:space-between;">Subtotal:<strong>$ ${subtot.toLocaleString('es-CO')}</strong></div>
            ${f.descuento ? `<div style="display:flex;justify-content:space-between;color:red;">Descuento:<strong>-$ ${f.descuento.toLocaleString('es-CO')}</strong></div>` : ''}
            <div style="display:flex;justify-content:space-between;">Propina (10%):<strong>$ ${f.propina.toLocaleString('es-CO')}</strong></div>
            <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;border-top:2px solid #1a1a1a;margin-top:8px;padding-top:8px;">TOTAL:<span>${fmt(f.total)}</span></div>
          </div>
          <div style="margin-top:10px;font-size:12px;color:#888;">
            Mesa: ${f.mesaId} | Método: ${f.metodoPago}<br>
            Mesero: ${f.mesero} | Cajero: ${f.cajero}
          </div>
          <div style="text-align:center;margin-top:16px;font-size:11px;color:#aaa;">¡Gracias por su visita!</div>
        </div>`;
    },
  },

  // ── Usuarios ──────────────────────────────────────────────
  usuarios: {
    openModal(id = null) {
      Model.editingId = id;
      document.getElementById('modal-user-title').textContent = id ? 'Editar Usuario' : 'Nuevo Usuario';
      if (id) {
        const u = Model.findUser(id);
        document.getElementById('user-edit-id').value  = id;
        document.getElementById('user-nombre').value   = u.name;
        document.getElementById('user-email').value    = u.email;
        document.getElementById('user-username').value = u.username;
        document.getElementById('user-rol').value      = u.role;
        document.getElementById('user-pass').value     = '';
        document.getElementById('user-pass2').value    = '';
      } else {
        ['user-nombre','user-email','user-username','user-pass','user-pass2'].forEach(f => document.getElementById(f).value = '');
      }
      openModal('modal-usuario');
    },

    save() {
      const nombre   = document.getElementById('user-nombre').value.trim();
      const email    = document.getElementById('user-email').value.trim();
      const username = document.getElementById('user-username').value.trim().toLowerCase();
      const role     = document.getElementById('user-rol').value;
      const pass     = document.getElementById('user-pass').value;
      const pass2    = document.getElementById('user-pass2').value;
      const initials = nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      if (!nombre || !email || !username) { toast('Complete los campos requeridos', 'error'); return; }
      if (!Model.editingId && !pass)      { toast('Ingrese una contraseña', 'error'); return; }
      if (pass && pass !== pass2)         { toast('Las contraseñas no coinciden', 'error'); return; }
      if (Model.editingId) {
        const u = Model.findUser(Model.editingId);
        Object.assign(u, { name:nombre, email, username, role, initials });
        if (pass) u.pass = pass;
        logAudit('Modificación', 'Usuarios', `Usuario "${username}" actualizado`);
        toast(`"${nombre}" actualizado`);
      } else {
        if (Model.users.find(x => x.username === username)) { toast('El nombre de usuario ya existe', 'error'); return; }
        Model.users.push({ id:genId(), username, pass, name:nombre, email, role, initials, status:'activo' });
        logAudit('Creación', 'Usuarios', `Usuario "${username}" creado — Rol: ${role}`);
        toast(`Usuario "${nombre}" creado`, 'success');
      }
      closeModal('modal-usuario'); renderUsuarios(''); Model.editingId = null;
    },

    toggle(id) {
      const u      = Model.findUser(id);
      const action = u.status === 'activo' ? 'desactivar' : 'activar';
      confirmAction(`${action.charAt(0).toUpperCase() + action.slice(1)} usuario`, `¿${action} a "${u.name}"?`, () => {
        u.status = u.status === 'activo' ? 'inactivo' : 'activo';
        logAudit('Modificación', 'Usuarios', `Usuario "${u.username}" ${u.status === 'activo' ? 'activado' : 'desactivado'}`);
        toast(`"${u.name}" ${u.status === 'activo' ? 'activado' : 'desactivado'}`);
        renderUsuarios('');
      });
    },

    resetPass(id) {
      const u = Model.findUser(id);
      confirmAction('Restablecer contraseña', `¿Restablecer contraseña de "${u.name}"? Se asignará la contraseña temporal "1234".`, () => {
        u.pass = '1234';
        logAudit('Reset contraseña', 'Usuarios', `Contraseña de "${u.username}" restablecida`);
        toast(`Contraseña de "${u.name}" restablecida a "1234"`, 'warning');
      });
    },
  },

  // ── Configuración ─────────────────────────────────────────
  config: {
    cambiarPassword() {
      const actual   = document.getElementById('cfg-pass-actual').value;
      const nueva    = document.getElementById('cfg-pass-nueva').value;
      const confirm  = document.getElementById('cfg-pass-confirm').value;
      if (!actual || !nueva || !confirm) { toast('Complete todos los campos', 'error'); return; }
      if (Model.currentUser.pass !== actual) { toast('Contraseña actual incorrecta', 'error'); return; }
      if (nueva !== confirm)                 { toast('Las contraseñas nuevas no coinciden', 'error'); return; }
      if (nueva.length < 4)                  { toast('La contraseña debe tener al menos 4 caracteres', 'error'); return; }
      Model.currentUser.pass = nueva;
      Model.users.find(u => u.id === Model.currentUser.id).pass = nueva;
      logAudit('Cambio de contraseña', 'Sesión', 'El usuario cambió su contraseña');
      toast('Contraseña actualizada correctamente ✓', 'success');
      ['cfg-pass-actual','cfg-pass-nueva','cfg-pass-confirm'].forEach(f => document.getElementById(f).value = '');
    },
  },

  // ── Exportación PDF / Excel ───────────────────────────────
  exportar: {
    _pdf(titulo, datos) {
      const encabezado = `<html><head><title>${titulo}</title>
        <style>body{font-family:Arial,sans-serif;padding:30px;font-size:13px;}
        h1{font-size:20px;border-bottom:2px solid #1a1a1a;padding-bottom:8px;}
        table{width:100%;border-collapse:collapse;margin-top:16px;}
        th{background:#1a1a1a;color:#fff;padding:8px 10px;text-align:left;font-size:12px;}
        td{padding:8px 10px;border-bottom:1px solid #eee;}
        .info{font-size:12px;color:#666;margin-bottom:16px;}
        @media print{body{padding:10px;}}</style></head><body>`;
      const header = `<h1>Restaurante Mangia - ${titulo}</h1>
        <div class="info">Generado: ${dt()} | Usuario: ${Model.currentUser.name}</div>`;
      const win = window.open('','_blank','width=900,height=600');
      if (!win) { toast('Active las ventanas emergentes para exportar', 'error'); return; }
      win.document.write(encabezado + header + datos + '</body></html>');
      win.document.close();
      setTimeout(() => win.print(), 500);
      logAudit('Exportación PDF', 'Reportes', `Reporte "${titulo}" exportado`);
      toast(`"${titulo}" exportado ✓`, 'success');
    },

    _excel(titulo, encabezados, filas) {
      if (filas.length === 0) { toast('No hay datos para el periodo seleccionado.', 'error'); return; }
      let csv = encabezados.join(',') + '\n';
      filas.forEach(fila => {
        csv += fila.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',') + '\n';
      });
      const blob = new Blob(['\ufeff' + csv], { type:'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `mangia_${titulo.replace(/\s+/g,'_')}_${today()}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      logAudit('Exportación Excel', 'Reportes', `Reporte "${titulo}" exportado a CSV`);
      toast(`"${titulo}" exportado ✓`, 'success');
    },

    ventasPDF() {
      if (Model.facturas.length === 0) { toast('No hay datos para el periodo seleccionado', 'error'); return; }
      const rows  = Model.menu.slice(0, 5).map((m, i) => {
        const u = [78,62,54,38,48][i];
        return `<tr><td>${m.nombre}</td><td>${u}</td><td>$${(m.precio * u).toLocaleString('es-CO')}</td></tr>`;
      }).join('');
      const total = Model.facturas.reduce((s, f) => s + f.total, 0) + 1245000;
      this._pdf('Reporte de Ventas', `<table><thead><tr><th>Plato</th><th>Unidades</th><th>Ingresos</th></tr></thead><tbody>${rows}</tbody></table><p style="margin-top:16px;font-size:16px;font-weight:700;">Total acumulado: ${fmt(total)}</p>`);
    },
    ventasExcel() {
      if (Model.facturas.length === 0) { toast('No hay datos', 'error'); return; }
      this._excel('Ventas', ['Factura','Mesa','Total','Metodo Pago','Mesero','Cajero','Hora','Fecha'],
        Model.facturas.map(f => [f.id,f.mesaId,f.total,f.metodoPago,f.mesero,f.cajero,f.hora,f.fecha]));
    },
    productosPDF() {
      if (Model.menu.length === 0) { toast('No hay datos en el menú', 'error'); return; }
      const filas = Model.menu.map((m, i) => {
        const u = [78,62,54,38,48,30,25,18,22][i] || 0;
        return `<tr><td>${i+1}</td><td>${m.nombre}</td><td>${m.cat}</td><td>${u}</td><td>${fmt(u * m.precio)}</td></tr>`;
      }).join('');
      this._pdf('Productos más Vendidos', `<table><thead><tr><th>#</th><th>Plato</th><th>Categoría</th><th>Unidades</th><th>Ingresos</th></tr></thead><tbody>${filas}</tbody></table>`);
    },
    inventarioPDF() {
      if (Model.inventario.length === 0) { toast('No hay datos de inventario', 'error'); return; }
      const filas = Model.inventario.map(i =>
        `<tr><td>${i.nombre}</td><td>${i.unidad}</td><td>${i.stock}</td><td>${i.minimo}</td><td>${i.stock<=i.minimo?'CRÍTICO':'Normal'}</td></tr>`
      ).join('');
      this._pdf('Consumo de Inventario', `<table><thead><tr><th>Insumo</th><th>Unidad</th><th>Stock actual</th><th>Mínimo</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>`);
    },
    auditoriaPDF() {
      if (Model.auditLog.length === 0) { toast('No hay registros de auditoría', 'error'); return; }
      const filas = Model.auditLog.slice(0, 50).map(l =>
        `<tr><td>${l.fecha} ${l.hora}</td><td>${l.usuario}</td><td>${l.modulo}</td><td>${l.accion}</td><td>${l.detalle}</td></tr>`
      ).join('');
      this._pdf('Auditoría del Sistema', `<table><thead><tr><th>Fecha/Hora</th><th>Usuario</th><th>Módulo</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${filas}</tbody></table>`);
    },
  },
};

// ── Atajos de teclado ─────────────────────────────────────
document.getElementById('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') Controller.auth.login(); });
document.getElementById('login-user').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-pass').focus(); });

// ── Lista de espera (agregado al Controller) ──────────────
Controller.listaEspera = {
  agregar() {
    const n = document.getElementById('espera-nombre').value.trim();
    const p = document.getElementById('espera-personas').value;
    if (!n) { toast('Ingrese el nombre', 'error'); return; }
    Model.listaEspera.push({ nombre: n, personas: p, hora: now() });
    toast(`${n} agregado a la lista de espera`);
    document.getElementById('espera-nombre').value = '';
    renderListaEspera();
  },
};
