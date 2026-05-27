export default function PanelInstructor() {
  return (
    <div style={{ padding: 24, color: 'var(--text)' }}>
      <h2 style={{ marginBottom: 14 }}>Panel de instructor</h2>
      <p style={{ maxWidth: 620, lineHeight: 1.7, color: 'var(--muted)' }}>
        Aquí podrás gestionar las licencias y tus estudiantes cuando el módulo de instructor esté conectado.
      </p>
      <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
        <div style={{ padding: 18, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <strong>Función disponible:</strong>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
            Cargue masivo, ver estudiantes y asignar licencias.
          </p>
        </div>
        <div style={{ padding: 18, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <strong>Próximamente:</strong>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
            Más herramientas de instructor e informes de licencias.
          </p>
        </div>
      </div>
    </div>
  );
}
