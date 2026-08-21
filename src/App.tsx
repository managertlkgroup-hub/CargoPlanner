} else {
        setResult(result);
        // Сохраняем эталонные позиции для кнопки «Сбросить позиции»
        const pristineMap: PristineMap = {};
        result.variants.forEach((v) => {
          pristineMap[v.id] = v.items;
        });
        setPristine(pristineMap);
        // По умолчанию выбираем вариант с лучшим заполнением (первый после сортировки)
        const best = result.variants[0];
        setActiveVariant(best.id);
      }