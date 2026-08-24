setCalculating(true);
    try {
      const result = packItems(vehicle, cargo, settings, loadingPoints);
      console.log('[App] Результат расчёта:', {
        variants: result.variants.length,
        error: result.error,
      });
      if (result.error) {
        setError(result.error);
        setResult(null);
        setActiveVariant(null);
        return;
      }
      setResult(result);