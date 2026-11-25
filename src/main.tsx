import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent React 19 dev-mode logComponentRender from crashing Chrome with
// "DataCloneError: Failed to execute 'measure' on 'Performance': Data cannot be cloned, out of memory"
// when structured-cloning large table props (6,000+ rows) into DevTools performance measures.
if (typeof window !== 'undefined' && window.performance && typeof window.performance.measure === 'function') {
  const originalMeasure = window.performance.measure.bind(window.performance);
  window.performance.measure = ((
    measureName: string,
    startOrMeasureOptions?: string | PerformanceMeasureOptions,
    endMark?: string
  ) => {
    const isReactDevToolsMeasure =
      (typeof measureName === 'string' && measureName.startsWith('\u200b')) ||
      (typeof startOrMeasureOptions === 'object' &&
        startOrMeasureOptions !== null &&
        Boolean((startOrMeasureOptions as PerformanceMeasureOptions & { detail?: { devtools?: unknown } }).detail?.devtools));

    if (isReactDevToolsMeasure) {
      return undefined as unknown as PerformanceMeasure;
    }

    try {
      return originalMeasure(measureName, startOrMeasureOptions as any, endMark);
    } catch {
      return undefined as unknown as PerformanceMeasure;
    }
  }) as typeof window.performance.measure;
}

createRoot(document.getElementById('root')!).render(<App />);

