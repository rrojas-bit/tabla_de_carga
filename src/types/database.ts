export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bids: {
        Row: {
          cabezal_id: string | null
          carga_id: string
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["bid_estado"]
          id: string
          monto: number
          nota: string | null
          tiempo_respuesta: Database["public"]["Enums"]["tiempo_respuesta"]
          updated_at: string
        }
        Insert: {
          cabezal_id?: string | null
          carga_id: string
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["bid_estado"]
          id?: string
          monto: number
          nota?: string | null
          tiempo_respuesta: Database["public"]["Enums"]["tiempo_respuesta"]
          updated_at?: string
        }
        Update: {
          cabezal_id?: string | null
          carga_id?: string
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["bid_estado"]
          id?: string
          monto?: number
          nota?: string | null
          tiempo_respuesta?: Database["public"]["Enums"]["tiempo_respuesta"]
          updated_at?: string
        }
        Relationships: []
      }
      cargas: {
        Row: {
          bid_ganador_id: string | null
          bl_numero: string | null
          cliente_empresa_id: string
          created_at: string
          destino_direccion: string
          estado: Database["public"]["Enums"]["carga_estado"]
          fecha_disponible: string
          gps_requerido: boolean | null
          id: string
          modo_asignacion: Database["public"]["Enums"]["asignacion_modo"]
          naviera: string | null
          notas: string | null
          numero: string | null
          numero_contenedor: string | null
          peso_tm: number | null
          puerto_id: string
          seguro_carga: boolean | null
          sobrepeso: boolean | null
          tarifa_referencia: number | null
          tipo_contenedor: Database["public"]["Enums"]["contenedor_tipo"]
          tipo_operacion: Database["public"]["Enums"]["operacion_tipo"]
          transportista_asignado_id: string | null
          updated_at: string
        }
        Insert: {
          bid_ganador_id?: string | null
          bl_numero?: string | null
          cliente_empresa_id: string
          created_at?: string
          destino_direccion: string
          estado?: Database["public"]["Enums"]["carga_estado"]
          fecha_disponible: string
          gps_requerido?: boolean | null
          id?: string
          modo_asignacion?: Database["public"]["Enums"]["asignacion_modo"]
          naviera?: string | null
          notas?: string | null
          numero?: string | null
          numero_contenedor?: string | null
          peso_tm?: number | null
          puerto_id: string
          seguro_carga?: boolean | null
          sobrepeso?: boolean | null
          tarifa_referencia?: number | null
          tipo_contenedor: Database["public"]["Enums"]["contenedor_tipo"]
          tipo_operacion: Database["public"]["Enums"]["operacion_tipo"]
          transportista_asignado_id?: string | null
          updated_at?: string
        }
        Update: {
          bid_ganador_id?: string | null
          bl_numero?: string | null
          cliente_empresa_id?: string
          created_at?: string
          destino_direccion?: string
          estado?: Database["public"]["Enums"]["carga_estado"]
          fecha_disponible?: string
          gps_requerido?: boolean | null
          id?: string
          modo_asignacion?: Database["public"]["Enums"]["asignacion_modo"]
          naviera?: string | null
          notas?: string | null
          numero?: string | null
          numero_contenedor?: string | null
          peso_tm?: number | null
          puerto_id?: string
          seguro_carga?: boolean | null
          sobrepeso?: boolean | null
          tarifa_referencia?: number | null
          tipo_contenedor?: Database["public"]["Enums"]["contenedor_tipo"]
          tipo_operacion?: Database["public"]["Enums"]["operacion_tipo"]
          transportista_asignado_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["empresa_estado"]
          id: string
          nombre: string
          rtu: string | null
          score_plataforma: number | null
          tipo: Database["public"]["Enums"]["empresa_tipo"]
          total_evaluaciones: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["empresa_estado"]
          id?: string
          nombre: string
          rtu?: string | null
          score_plataforma?: number | null
          tipo: Database["public"]["Enums"]["empresa_tipo"]
          total_evaluaciones?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["empresa_estado"]
          id?: string
          nombre?: string
          rtu?: string | null
          score_plataforma?: number | null
          tipo?: Database["public"]["Enums"]["empresa_tipo"]
          total_evaluaciones?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      flags_piloto: {
        Row: {
          archivado_en: string | null
          created_at: string
          descripcion: string | null
          empresa_reportadora_id: string
          en_disputa: boolean | null
          id: string
          piloto_id: string
          tipo: Database["public"]["Enums"]["flag_tipo"]
          verificado: boolean | null
        }
        Insert: {
          archivado_en?: string | null
          created_at?: string
          descripcion?: string | null
          empresa_reportadora_id: string
          en_disputa?: boolean | null
          id?: string
          piloto_id: string
          tipo: Database["public"]["Enums"]["flag_tipo"]
          verificado?: boolean | null
        }
        Update: {
          archivado_en?: string | null
          created_at?: string
          descripcion?: string | null
          empresa_reportadora_id?: string
          en_disputa?: boolean | null
          id?: string
          piloto_id?: string
          tipo?: Database["public"]["Enums"]["flag_tipo"]
          verificado?: boolean | null
        }
        Relationships: []
      }
      flota: {
        Row: {
          activo: boolean | null
          anno: number | null
          created_at: string
          empresa_id: string
          estado: Database["public"]["Enums"]["flota_estado"]
          id: string
          marca: string | null
          modelo: string | null
          placa: string
          tipo: Database["public"]["Enums"]["flota_tipo"]
          tipo_chassis: Database["public"]["Enums"]["chassis_tipo"] | null
          updated_at: string
        }
        Insert: {
          activo?: boolean | null
          anno?: number | null
          created_at?: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["flota_estado"]
          id?: string
          marca?: string | null
          modelo?: string | null
          placa: string
          tipo: Database["public"]["Enums"]["flota_tipo"]
          tipo_chassis?: Database["public"]["Enums"]["chassis_tipo"] | null
          updated_at?: string
        }
        Update: {
          activo?: boolean | null
          anno?: number | null
          created_at?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["flota_estado"]
          id?: string
          marca?: string | null
          modelo?: string | null
          placa?: string
          tipo?: Database["public"]["Enums"]["flota_tipo"]
          tipo_chassis?: Database["public"]["Enums"]["chassis_tipo"] | null
          updated_at?: string
        }
        Relationships: []
      }
      movimientos: {
        Row: {
          bid_id: string | null
          cabezal_id: string | null
          carga_id: string
          created_at: string
          etapa_actual: number
          gps_actualizado_en: string | null
          gps_lat: number | null
          gps_lng: number | null
          historial: Json
          id: string
          piloto_id: string | null
          tipo_flujo: Database["public"]["Enums"]["flujo_tipo"]
          updated_at: string
        }
        Insert: {
          bid_id?: string | null
          cabezal_id?: string | null
          carga_id: string
          created_at?: string
          etapa_actual?: number
          gps_actualizado_en?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          historial?: Json
          id?: string
          piloto_id?: string | null
          tipo_flujo: Database["public"]["Enums"]["flujo_tipo"]
          updated_at?: string
        }
        Update: {
          bid_id?: string | null
          cabezal_id?: string | null
          carga_id?: string
          created_at?: string
          etapa_actual?: number
          gps_actualizado_en?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          historial?: Json
          id?: string
          piloto_id?: string | null
          tipo_flujo?: Database["public"]["Enums"]["flujo_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      notificaciones: {
        Row: {
          canal: string | null
          created_at: string
          cuerpo: string | null
          enviada: boolean | null
          id: string
          leida: boolean | null
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          canal?: string | null
          created_at?: string
          cuerpo?: string | null
          enviada?: boolean | null
          id?: string
          leida?: boolean | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          canal?: string | null
          created_at?: string
          cuerpo?: string | null
          enviada?: boolean | null
          id?: string
          leida?: boolean | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      piloto_empresa: {
        Row: {
          activo: boolean | null
          created_at: string
          empresa_id: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          piloto_id: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string
          empresa_id: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          piloto_id: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string
          empresa_id?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          piloto_id?: string
        }
        Relationships: []
      }
      pilotos: {
        Row: {
          created_at: string
          dpi: string
          id: string
          licencia_tipo: string | null
          licencia_vencimiento: string | null
          nombre_completo: string
          score_plataforma: number | null
          telefono: string | null
          total_viajes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dpi: string
          id?: string
          licencia_tipo?: string | null
          licencia_vencimiento?: string | null
          nombre_completo: string
          score_plataforma?: number | null
          telefono?: string | null
          total_viajes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dpi?: string
          id?: string
          licencia_tipo?: string | null
          licencia_vencimiento?: string | null
          nombre_completo?: string
          score_plataforma?: number | null
          telefono?: string | null
          total_viajes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          nombre_completo: string
          rol: Database["public"]["Enums"]["user_role"]
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id: string
          nombre_completo: string
          rol: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          nombre_completo?: string
          rol?: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      puertos: {
        Row: {
          activo: boolean | null
          codigo: string
          id: string
          nombre: string
          pais: string
          region: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          id?: string
          nombre: string
          pais?: string
          region?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          id?: string
          nombre?: string
          pais?: string
          region?: string | null
        }
        Relationships: []
      }
      tarifas_ruta: {
        Row: {
          created_at: string
          destino: string
          empresa_id: string
          id: string
          origen: string
          tarifa_minima: number
        }
        Insert: {
          created_at?: string
          destino: string
          empresa_id: string
          id?: string
          origen: string
          tarifa_minima: number
        }
        Update: {
          created_at?: string
          destino?: string
          empresa_id?: string
          id?: string
          origen?: string
          tarifa_minima?: number
        }
        Relationships: []
      }
      transportista_perfil: {
        Row: {
          aprobado_en: string | null
          aprobado_por: string | null
          auto_asignacion_activa: boolean | null
          created_at: string
          documentos: Json | null
          empresa_id: string
          fecha_vencimiento_seguro: string | null
          inspeccion_cabezal: boolean | null
          seguro_contenedor: boolean | null
          seguro_terceros_vigente: boolean | null
          tarifa_minima_km: number | null
        }
        Insert: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          auto_asignacion_activa?: boolean | null
          created_at?: string
          documentos?: Json | null
          empresa_id: string
          fecha_vencimiento_seguro?: string | null
          inspeccion_cabezal?: boolean | null
          seguro_contenedor?: boolean | null
          seguro_terceros_vigente?: boolean | null
          tarifa_minima_km?: number | null
        }
        Update: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          auto_asignacion_activa?: boolean | null
          created_at?: string
          documentos?: Json | null
          empresa_id?: string
          fecha_vencimiento_seguro?: string | null
          inspeccion_cabezal?: boolean | null
          seguro_contenedor?: boolean | null
          seguro_terceros_vigente?: boolean | null
          tarifa_minima_km?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      asignacion_modo: "manual" | "automatico"
      bid_estado: "pendiente" | "aceptada" | "rechazada" | "retirada"
      carga_estado:
        | "borrador"
        | "publicada"
        | "en_subasta"
        | "asignada"
        | "en_transito"
        | "entregada"
        | "cancelada"
      chassis_tipo:
        | "20_dry"
        | "40_dry"
        | "40_hc"
        | "reefer"
        | "open_top"
        | "flat_rack"
        | "3_ejes"
      contenedor_tipo:
        | "20_dry"
        | "40_dry"
        | "40_hc"
        | "reefer"
        | "open_top"
        | "flat_rack"
        | "45"
      empresa_estado:
        | "pendiente_calificacion"
        | "activo"
        | "suspendido"
        | "rechazado"
      empresa_tipo: "transportista" | "importador" | "exportador" | "mixto"
      flag_tipo: "robo" | "abandono_carga" | "dano_equipo" | "otro"
      flota_estado: "libre" | "en_ruta" | "mantenimiento"
      flota_tipo: "cabezal" | "chassis"
      flujo_tipo: "importacion" | "exportacion"
      operacion_tipo: "importacion" | "exportacion"
      tiempo_respuesta: "menos_2h" | "2_4h" | "mismo_dia"
      user_role: "transportista" | "importador" | "admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]

export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T]
