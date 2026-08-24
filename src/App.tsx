<div className="left-panel">
          <VehicleSelector />
          <div className="section-divider" />
          <div className="variant-tabs" style={{ marginBottom: 4 }}>
            <button
              type="button"
              className={`variant-tab ${leftTab === 'cargo' ? 'active' : ''}`}
              onClick={() => setLeftTab('cargo')}
            >
              📦 Грузы
            </button>
            <button
              type="button"
              className={`variant-tab ${leftTab === 'route' ? 'active' : ''}`}
              onClick={() => setLeftTab('route')}
            >
              🗺 Маршрут
            </button>
          </div>
          {leftTab === 'cargo' ? <CargoTable /> : <RouteEditor />}
          <div className="section-divider" />
          <button
            onClick={handleCalculate}
            disabled={isCalculating || cargo.length === 0}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 700 }}
          >
            {isCalculating ? '⏳ Расчёт…' : '🧮 Рассчитать раскладку'}
          </button>
        </div>