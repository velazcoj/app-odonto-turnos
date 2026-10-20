import { Component } from 'react';
import { Empty } from './ui.jsx';
import store from '../data/store.js';

// En la app instalada no hay botón de recargar: si algo falla al dibujar una pantalla (o se corta la
// conexión con los datos), mostrar una salida en vez de quedar en blanco.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    // Si el problema es de un dato de hoy, recargar en Hoy vuelve a fallar: ofrecer otras pantallas.
    const go = (hash) => () => { location.hash = hash; location.reload(); };
    return (
      <div className="screen">
        <Empty icon="x" title="Algo salió mal" text="Probá de nuevo. Si vuelve a pasar, abrí otra pantalla."
          action={(
            <div className="col gap8">
              <button className="btn primary" onClick={() => location.reload()}>Reintentar</button>
              <button className="link-btn center-btn" onClick={go('#/agenda')}>Ir a la agenda</button>
              <button className="link-btn center-btn" onClick={go('#/pacientes')}>Ir a pacientes</button>
              {/* Si falla por permisos (otra cuenta, o el usuario se recreó con otro UID), recargar no alcanza. */}
              {!store.isDemo && (
                <button className="link-btn muted center-btn" onClick={() => store.logout().finally(() => location.reload())}>
                  Cerrar sesión
                </button>
              )}
            </div>
          )} />
      </div>
    );
  }
}
