# Análisis de suelo por cultivo (ciclo de vida)

**Antes (RF3):** análisis por *lote*, 6 parámetros, sin saber a qué cultivo ni en qué etapa correspondían.

**Ahora:** el suelo sigue siendo del **lote** (`loteId` obligatorio), pero cada análisis puede **atribuirse a un cultivo**
(`cultivoId`, opcional, misma regla de lote) y guarda la **etapa** del cultivo al muestrear (foto del momento). Un cultivo
puede tener todos los análisis que necesite durante su vida; un lote que cambia de cultivo conserva su historial.

## Qué se puede registrar
- pH, materia orgánica, N, P (Bray II), K, conductividad, textura (ya existían).
- **Nuevos:** Ca, Mg, Na, Al, CIC (meq/100g); S, B, Fe, Mn, Zn, Cu (ppm); profundidad de muestreo; **fotos del informe** (hasta 4).
- Editar ahora puede **limpiar** un valor (antes un campo borrado no se actualizaba).

## Qué se muestra (detalle del cultivo)
- Filtro «Todos los del lote / De este cultivo», y badge por análisis (Este cultivo · etapa / Otro cultivo del lote / Todo el lote).
- **Evolución en el tiempo:** tabla parámetros × fechas (últimos 6) con tendencia entre los dos últimos valores medidos.
- **Relaciones entre bases** del último análisis: Ca/Mg, Mg/K, (Ca+Mg)/K y saturación de Al — aritmética pura, sin veredicto.
- Aviso «último análisis hace N meses — conviene repetirlo (sugerencia: al menos una vez al año)».
- Semáforo Bajo/Óptimo/Alto **solo** para los 6 parámetros con rango de referencia general (`suelo-referencia.ts`); los demás
  se muestran sin interpretar (no inventamos rangos). Rangos específicos por cultivo dependen del motor de fichas técnicas.

## Reglas
- Atribuir a un cultivo de OTRO lote se rechaza (400). Borrar un cultivo NO borra sus análisis (`SetNull`, quedan en el lote).
- Eliminar un análisis deja auditoría (`analisis_suelo.eliminar`).
- Fechas de muestreo se muestran en UTC (día calendario) para no correrse un día en hora de Colombia.

## Pendiente / ideas
Adjuntar PDF (no hay almacenamiento de archivos; hoy solo fotos) · gráficas · recomendaciones de fertilización cruzando
análisis × `RequerimientoNutricional` de la ficha técnica · rangos por cultivo/variedad · modo simple (hoy exclusión con salida vía Mapa).
