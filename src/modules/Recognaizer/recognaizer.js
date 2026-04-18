// utils/gestureRecognizer.js
// Распознавание жестов: 10 заклинаний с простой эвристикой

export function recognizeGesture(points, options = {}) {
  const {
    minPoints = 3,
    threshold = 0.5  // 0.0 = всегда сработает, 1.0 = идеально точно
  } = options;

  if (!points || !Array.isArray(points) || points.length < minPoints) {
    return null;
  }

  // === БАЗОВЫЕ МЕТРИКИ ===
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  
  const first = points[0];
  const last = points[points.length - 1];
  const midIndex = Math.floor(points.length / 2);
  const mid = points[midIndex];
  
  const startEndDist = Math.hypot(first.x - last.x, first.y - last.y);

  // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
  
  // Подсчёт смены направления (для зигзагов)
  function countDirectionChanges(pts, axis = 'x') {
    let changes = 0;
    let prevDir = 0;
    for (let i = 1; i < pts.length; i++) {
      const currDir = Math.sign(pts[i][axis] - pts[i-1][axis]);
      if (currDir !== 0 && prevDir !== 0 && currDir !== prevDir) {
        changes++;
      }
      if (currDir !== 0) prevDir = currDir;
    }
    return changes;
  }
  
  // Проверка, находится ли точка между двумя другими по оси
  function isBetween(val, a, b, margin = 0.1) {
    const min = Math.min(a, b) - margin;
    const max = Math.max(a, b) + margin;
    return val >= min && val <= max;
  }

  // === ЖЕСТ #4: ГОРИЗОНТАЛЬНАЯ ЛИНИЯ → ✅
  if (rangeX > 0.15 && rangeY < 0.12 && rangeX > rangeY * 2) {
    const confidence = Math.min(1, rangeX / 0.9) * (1 - rangeY / 0.15);
    if (confidence > threshold * 0.8) {
      console.log(`✅ #4 Горизонталь: ${confidence.toFixed(2)}`);
      return 4;
    }
  }

  // === ЖЕСТ #3: ВЕРТИКАЛЬНАЯ ЛИНИЯ → ✅
  if (rangeY > 0.15 && rangeX < 0.12 && rangeY > rangeX * 2) {
    const confidence = Math.min(1, rangeY / 0.9) * (1 - rangeX / 0.15);
    if (confidence > threshold * 0.8) {
      console.log(`✅ #3 Вертикаль: ${confidence.toFixed(2)}`);
      return 3;
    }
  }

  // === ЖЕСТ #1: V-ОБРАЗНЫЙ (снизу вверх) → 🆕
  // Рисуется: ↘️ затем ↗️ (середина ниже концов)
  const startEndY = (first.y + last.y) / 2;
  const vDepth = startEndY - mid.y; // положительное = середина ниже
  
  if (vDepth > 0.15 && rangeX > 0.2 && isBetween(mid.x, first.x, last.x, 0.2)) {
    const confidence = Math.min(1, vDepth / 0.4) * (rangeX / 1.0);
    if (confidence > threshold * 0.7) {
      console.log(`✅ #1 V-жест: глубина=${vDepth.toFixed(2)}, conf=${confidence.toFixed(2)}`);
      return 1;
    }
  }

  // === ЖЕСТ #7: Λ-ОБРАЗНЫЙ (сверху вниз, инвертированный V) → 🆕
  // Рисуется: ↗️ затем ↘️ (середина выше концов)
  const lambdaHeight = mid.y - startEndY; // положительное = середина выше
  
  if (lambdaHeight > 0.15 && rangeX > 0.2 && isBetween(mid.x, first.x, last.x, 0.2)) {
    const confidence = Math.min(1, lambdaHeight / 0.4) * (rangeX / 1.0);
    if (confidence > threshold * 0.7) {
      console.log(`✅ #7 Λ-жест: высота=${lambdaHeight.toFixed(2)}, conf=${confidence.toFixed(2)}`);
      return 7;
    }
  }

  // === ЖЕСТ #2: КВАДРАТ / ПРЯМОУГОЛЬНИК → 🆕
  // Условие: движение в обе оси + начало и конец рядом
  if (rangeX > 0.2 && rangeY > 0.2 && startEndDist < 0.25 && points.length > 8) {
    // Дополнительно: проверяем, что есть 4 "угла" (смены направления)
    const xChanges = countDirectionChanges(points, 'x');
    const yChanges = countDirectionChanges(points, 'y');
    const hasCorners = (xChanges >= 1 && yChanges >= 1) || startEndDist < 0.15;
    
    if (hasCorners) {
      const confidence = (1 - startEndDist / 0.3) * Math.min(1, (rangeX + rangeY) / 1.5);
      if (confidence > threshold) {
        console.log(`✅ #2 Квадрат: замкнутость=${(1-startEndDist).toFixed(2)}, conf=${confidence.toFixed(2)}`);
        return 2;
      }
    }
  }

  // === ЖЕСТ #5: КРУГ / ОВАЛ (замкнутая кривая) → 🆕
  // Условие: почти одинаковые диапазоны + очень близкие начало и конец
  if (rangeX > 0.15 && rangeY > 0.15 && startEndDist < 0.15) {
    const aspectRatio = Math.min(rangeX, rangeY) / Math.max(rangeX, rangeY);
    // Круг: соотношение сторон близко к 1
    if (aspectRatio > 0.6 && points.length > 10) {
      const confidence = aspectRatio * (1 - startEndDist / 0.2);
      if (confidence > threshold * 0.9) {
        console.log(`✅ #5 Круг: форма=${aspectRatio.toFixed(2)}, conf=${confidence.toFixed(2)}`);
        return 5;
      }
    }
  }

  // === ЖЕСТ #6: Z-ОБРАЗНЫЙ (зигзаг) → 🆕
  // Условие: 2+ смены направления по X и по Y
  const xChanges = countDirectionChanges(points, 'x');
  const yChanges = countDirectionChanges(points, 'y');
  
  if (xChanges >= 2 && rangeX > 0.2 && rangeY > 0.1) {
    // Z: начинается слева/справа, заканчивается с противоположной стороны
    const horizontalTravel = Math.abs(last.x - first.x);
    if (horizontalTravel > 0.3) {
      const confidence = Math.min(1, xChanges / 3) * (rangeX / 1.0);
      if (confidence > threshold * 0.7) {
        console.log(`✅ #6 Z-жест: смены=${xChanges}, conf=${confidence.toFixed(2)}`);
        return 6;
      }
    }
  }

  // === ЖЕСТ #8: L-ОБРАЗНЫЙ (угол) → 🆕
  // Условие: движение в одном направлении, затем резкий поворот на 90°
  const firstHalf = points.slice(0, midIndex + 1);
  const secondHalf = points.slice(midIndex);
  
  const fX = Math.max(...firstHalf.map(p=>p.x)) - Math.min(...firstHalf.map(p=>p.x));
  const fY = Math.max(...firstHalf.map(p=>p.y)) - Math.min(...firstHalf.map(p=>p.y));
  const sX = Math.max(...secondHalf.map(p=>p.x)) - Math.min(...secondHalf.map(p=>p.x));
  const sY = Math.max(...secondHalf.map(p=>p.y)) - Math.min(...secondHalf.map(p=>p.y));
  
  // L: первая половина — в основном по одной оси, вторая — по другой
  const firstAxis = fX > fY * 1.5 ? 'X' : fY > fX * 1.5 ? 'Y' : null;
  const secondAxis = sX > sY * 1.5 ? 'X' : sY > sX * 1.5 ? 'Y' : null;
  
  if (firstAxis && secondAxis && firstAxis !== secondAxis) {
    if ((fX + sX > 0.15) && (fY + sY > 0.15)) {
      const confidence = Math.min(fX + sX, fY + sY) / 0.8;
      if (confidence > threshold * 0.7) {
        console.log(`✅ #8 L-жест: ${firstAxis}→${secondAxis}, conf=${confidence.toFixed(2)}`);
        return 8;
      }
    }
  }

  // === ЖЕСТ #9: ДИАГОНАЛЬ ↗️ (слева-снизу → справа-сверху) → 🆕
  if (rangeX > 0.2 && rangeY > 0.2) {
    const diagUp = (last.x > first.x && last.y > first.y); // ↗️
    const diagDown = (last.x > first.x && last.y < first.y); // ↘️
    
    if (diagUp || diagDown) {
      // Проверяем "прямолинейность": отклонение от прямой линии
      const expectedY = first.y + (last.y - first.y) * ((mid.x - first.x) / (rangeX || 1));
      const deviation = Math.abs(mid.y - expectedY);
      
      if (deviation < 0.15) {
        const confidence = Math.min(1, Math.min(rangeX, rangeY) / 0.7) * (1 - deviation / 0.15);
        if (confidence > threshold * 0.7) {
          const dir = diagUp ? '↗️' : '↘️';
          console.log(`✅ #9 Диагональ ${dir}: откл=${deviation.toFixed(2)}, conf=${confidence.toFixed(2)}`);
          return 9;
        }
      }
    }
  }

  // === ЖЕСТ #10: W-ОБРАЗНЫЙ (двойной V) → 🆕
  // Условие: 3+ смены направления по Y при движении по X
  if (yChanges >= 3 && rangeX > 0.3 && rangeY > 0.15) {
    const confidence = Math.min(1, yChanges / 4) * (rangeX / 1.0);
    if (confidence > threshold * 0.8) {
      console.log(`✅ #10 W-жест: сменыY=${yChanges}, conf=${confidence.toFixed(2)}`);
      return 10;
    }
  }

  // === НИЧЕГО НЕ ПОДХОДИТ ===
  console.log(`❌ Не распознано: X[${rangeX.toFixed(2)}] Y[${rangeY.toFixed(2)}] замкнутость[${startEndDist.toFixed(2)}] точки[${points.length}]`);
  return null;
}