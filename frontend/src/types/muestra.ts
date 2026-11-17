export interface CreateMuestra {
  codigo: string;
}

export interface Muestra extends CreateMuestra {
  id: number;
  control_id: number;
  created_at: string;
  updated_at: string;
}
