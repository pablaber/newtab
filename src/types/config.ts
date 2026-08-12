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

export type GradientDirection = 'up' | 'down' | 'left' | 'right';

export interface GradientConfig {
  enabled: boolean;
  color2: string;
  direction: GradientDirection;
}

export type ForegroundSetting = 'auto' | 'light' | 'dark';

export interface BackgroundConfig {
  imageUrl?: string;
  opacity?: number;
  color?: string;
  gradient?: GradientConfig;
  /** Foreground content color: `auto` derives it from the background. */
  foreground?: ForegroundSetting;
}

export interface SearchConfig {
  enabled: boolean;
  placeholder?: string;
}

export interface SubcommandItemConfig {
  label: string;
  url: string;
  icon?: string;
}

export interface SubcommandFieldConfig {
  name: string;
}

export interface SubcommandFreeformConfig {
  fields: SubcommandFieldConfig[];
  urlTemplate: string;
}

export interface SubcommandConfig {
  name: string;
  trigger: string;
  items: SubcommandItemConfig[];
  freeform?: SubcommandFreeformConfig;
}

export interface AppConfig {
  version: number;
  background?: BackgroundConfig;
  search?: SearchConfig;
  modules: ModuleConfig[];
  subcommands?: SubcommandConfig[];
}
