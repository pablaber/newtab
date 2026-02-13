export interface LinkConfig {
  url: string;
  label: string;
  icon?: string;
  hidden?: boolean;
}

export interface ModuleConfig {
  type: 'links';
  title: string;
  hidden?: boolean;

  links: LinkConfig[];
}

export interface BackgroundConfig {
  imageUrl?: string;
  opacity?: number;
  color?: string;
}

export interface SearchConfig {
  enabled: boolean;
  placeholder?: string;
}

export interface AppConfig {
  version: number;
  background?: BackgroundConfig;
  search?: SearchConfig;
  modules: ModuleConfig[];
}
