export interface Provincia {
  id: number;
  nombre: string;
}

export interface Canton extends Provincia {
  provincia_id: number;
}

export interface Parroquia extends Provincia {
  canton_id: number;
}
