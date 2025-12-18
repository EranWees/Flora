export interface Position {
  x: number;
  y: number;
}

export type NodeType = 'seed' | 'variation' | 'study';

export interface NodeData {
  id: string;
  parentId: string | null;
  type: NodeType;
  imageUrl: string;
  prompt: string;
  label: string;
  position: Position;
  loading?: boolean;
  meta?: {
    intent?: string; // e.g. "Shift Pose", "Swap Fabric"
    model?: string;
  };
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export type GenerationIntent = 'pose' | 'angle' | 'fabric' | 'light' | 'crop' | 'model-less';
