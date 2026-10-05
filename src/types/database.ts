export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Spot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  region: string | null;
  created_by: string | null;
  created_at: string;
};

export type CustomSpot = {
  id: string;
  owner_id: string;
  name: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
};

export type Session = {
  id: string;
  owner_id: string;
  spot_id: string | null;
  custom_spot_id: string | null;
  started_at: string;
  ended_at: string;
  wave_count: number;
  rating: number;
  created_at: string;
  updated_at: string;
};

export type HomeSpot = {
  id: string;
  owner_id: string;
  spot_id: string | null;
  custom_spot_id: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      spots: {
        Row: Spot;
        Insert: Partial<Spot> & { name: string; latitude: number; longitude: number };
        Update: Partial<Spot>;
        Relationships: [];
      };
      custom_spots: {
        Row: CustomSpot;
        Insert: Partial<CustomSpot> & { owner_id: string; latitude: number; longitude: number };
        Update: Partial<CustomSpot>;
        Relationships: [];
      };
      sessions: {
        Row: Session;
        Insert: Partial<Session> & {
          owner_id: string;
          started_at: string;
          ended_at: string;
          wave_count: number;
          rating: number;
        };
        Update: Partial<Session>;
        Relationships: [];
      };
      home_spots: {
        Row: HomeSpot;
        Insert: Partial<HomeSpot> & { owner_id: string };
        Update: Partial<HomeSpot>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
