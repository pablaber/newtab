import { useConfig } from './hooks/useConfig.ts';
import { BackgroundLayer } from './components/BackgroundLayer.tsx';
import { SearchBar } from './components/SearchBar.tsx';
import { ModuleGrid } from './components/ModuleGrid.tsx';
import './App.css';

function App() {
  const { config, loading, error } = useConfig();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error || !config) {
    return <div className="error">Failed to load configuration: {error}</div>;
  }

  return (
    <>
      <BackgroundLayer background={config.background} />
      <div className="content">
        <SearchBar
          enabled={config.search?.enabled ?? false}
          placeholder={config.search?.placeholder ?? 'Filter links...'}
          modules={config.modules}
        />
        <ModuleGrid modules={config.modules} />
      </div>
    </>
  );
}

export default App;
