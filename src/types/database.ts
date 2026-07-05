export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
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
          moneda: string
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
          moneda?: string
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
          moneda?: string
          monto?: number
          nota?: string | null
          tiempo_respuesta?: Database["public"]["Enums"]["tiempo_respuesta"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_cabezal_id_fkey"
            columns: ["cabezal_id"]
            isOneToOne: false
            referencedRelation: "flota"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cargas: {
        Row: {
          bid_ganador_id: string | null
          bl_numero: string | null
          cliente_empresa_id: string
          created_at: string
          destino_direccion: string
          duca_numero: string | null
          duca_tipo: string | null
          estado: Database["public"]["Enums"]["carga_estado"]
          fecha_disponible: string
          gps_requerido: boolean | null
          id: string
          mercancia: string | null
          modo_asignacion: Database["public"]["Enums"]["asignacion_modo"]
          moneda: string
          naviera: string | null
          notas: string | null
          numero: string | null
          numero_contenedor: string | null
          pais_origen: string | null
          peso_tm: number | null
          puerto_id: string
          seguro_carga: boolean | null
          sobrepeso: boolean | null
          tarifa_referencia: number | null
          tipo_contenedor: Database["public"]["Enums"]["contenedor_tipo"]
          tipo_operacion: Database["public"]["Enums"]["operacion_tipo"]
          transportista_asignado_id: string | null
          updated_at: string
          valor_mercancia_usd: number | null
        }
        Insert: {
          bid_ganador_id?: string | null
          bl_numero?: string | null
          cliente_empresa_id: string
          created_at?: string
          destino_direccion: string
          duca_numero?: string | null
          duca_tipo?: string | null
          estado?: Database["public"]["Enums"]["carga_estado"]
          fecha_disponible: string
          gps_requerido?: boolean | null
          id?: string
          mercancia?: string | null
          modo_asignacion?: Database["public"]["Enums"]["asignacion_modo"]
          moneda?: string
          naviera?: string | null
          notas?: string | null
          numero?: string | null
          numero_contenedor?: string | null
          pais_origen?: string | null
          peso_tm?: number | null
          puerto_id: string
          seguro_carga?: boolean | null
          sobrepeso?: boolean | null
          tarifa_referencia?: number | null
          tipo_contenedor: Database["public"]["Enums"]["contenedor_tipo"]
          tipo_operacion: Database["public"]["Enums"]["operacion_tipo"]
          transportista_asignado_id?: string | null
          updated_at?: string
          valor_mercancia_usd?: number | null
        }
        Update: {
          bid_ganador_id?: string | null
          bl_numero?: string | null
          cliente_empresa_id?: string
          created_at?: string
          destino_direccion?: string
          duca_numero?: string | null
          duca_tipo?: string | null
          estado?: Database["public"]["Enums"]["carga_estado"]
          fecha_disponible?: string
          gps_requerido?: boolean | null
          id?: string
          mercancia?: string | null
          modo_asignacion?: Database["public"]["Enums"]["asignacion_modo"]
          moneda?: string
          naviera?: string | null
          notas?: string | null
          numero?: string | null
          numero_contenedor?: string | null
          pais_origen?: string | null
          peso_tm?: number | null
          puerto_id?: string
          seguro_carga?: boolean | null
          sobrepeso?: boolean | null
          tarifa_referencia?: number | null
          tipo_contenedor?: Database["public"]["Enums"]["contenedor_tipo"]
          tipo_operacion?: Database["public"]["Enums"]["operacion_tipo"]
          transportista_asignado_id?: string | null
          updated_at?: string
          valor_mercancia_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cargas_cliente_empresa_id_fkey"
            columns: ["cliente_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_puerto_id_fkey"
            columns: ["puerto_id"]
            isOneToOne: false
            referencedRelation: "puertos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_transportista_asignado_id_fkey"
            columns: ["transportista_asignado_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bid_ganador"
            columns: ["bid_ganador_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_carga: {
        Row: {
          carga_id: string | null
          created_at: string
          empresa_id: string
          estado_extraccion: string
          extraccion: Json | null
          id: string
          mime_type: string
          nombre_archivo: string
          storage_path: string
          tipo: Database["public"]["Enums"]["documento_tipo"]
        }
        Insert: {
          carga_id?: string | null
          created_at?: string
          empresa_id: string
          estado_extraccion?: string
          extraccion?: Json | null
          id?: string
          mime_type: string
          nombre_archivo: string
          storage_path: string
          tipo?: Database["public"]["Enums"]["documento_tipo"]
        }
        Update: {
          carga_id?: string | null
          created_at?: string
          empresa_id?: string
          estado_extraccion?: string
          extraccion?: Json | null
          id?: string
          mime_type?: string
          nombre_archivo?: string
          storage_path?: string
          tipo?: Database["public"]["Enums"]["documento_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "documentos_carga_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_carga_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["empresa_estado"]
          id: string
          nombre: string
          rtu: string | null
          score_plataforma: number | null
          telefono_whatsapp: string | null
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
          telefono_whatsapp?: string | null
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
          telefono_whatsapp?: string | null
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
        Relationships: [
          {
            foreignKeyName: "flags_piloto_empresa_reportadora_id_fkey"
            columns: ["empresa_reportadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_piloto_piloto_id_fkey"
            columns: ["piloto_id"]
            isOneToOne: false
            referencedRelation: "pilotos"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "flota_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "movimientos_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_cabezal_id_fkey"
            columns: ["cabezal_id"]
            isOneToOne: false
            referencedRelation: "flota"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "cargas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_piloto_id_fkey"
            columns: ["piloto_id"]
            isOneToOne: false
            referencedRelation: "pilotos"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "piloto_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piloto_empresa_piloto_id_fkey"
            columns: ["piloto_id"]
            isOneToOne: false
            referencedRelation: "pilotos"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
          moneda: string
          origen: string
          tarifa_minima: number
        }
        Insert: {
          created_at?: string
          destino: string
          empresa_id: string
          id?: string
          moneda?: string
          origen: string
          tarifa_minima: number
        }
        Update: {
          created_at?: string
          destino?: string
          empresa_id?: string
          id?: string
          moneda?: string
          origen?: string
          tarifa_minima?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_ruta_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "transportista_perfil_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_empresa_on_signup: {
        Args: {
          p_nombre: string
          p_rtu?: string
          p_tipo: string
          p_user_id: string
        }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
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
      documento_tipo:
        | "duca"
        | "factura_proveedor"
        | "bl"
        | "packing_list"
        | "otro"
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

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      asignacion_modo: ["manual", "automatico"],
      bid_estado: ["pendiente", "aceptada", "rechazada", "retirada"],
      carga_estado: [
        "borrador",
        "publicada",
        "en_subasta",
        "asignada",
        "en_transito",
        "entregada",
        "cancelada",
      ],
      chassis_tipo: [
        "20_dry",
        "40_dry",
        "40_hc",
        "reefer",
        "open_top",
        "flat_rack",
        "3_ejes",
      ],
      contenedor_tipo: [
        "20_dry",
        "40_dry",
        "40_hc",
        "reefer",
        "open_top",
        "flat_rack",
        "45",
      ],
      documento_tipo: [
        "duca",
        "factura_proveedor",
        "bl",
        "packing_list",
        "otro",
      ],
      empresa_estado: [
        "pendiente_calificacion",
        "activo",
        "suspendido",
        "rechazado",
      ],
      empresa_tipo: ["transportista", "importador", "exportador", "mixto"],
      flag_tipo: ["robo", "abandono_carga", "dano_equipo", "otro"],
      flota_estado: ["libre", "en_ruta", "mantenimiento"],
      flota_tipo: ["cabezal", "chassis"],
      flujo_tipo: ["importacion", "exportacion"],
      operacion_tipo: ["importacion", "exportacion"],
      tiempo_respuesta: ["menos_2h", "2_4h", "mismo_dia"],
      user_role: ["transportista", "importador", "admin", "staff"],
    },
  },
} as const
