---
name: agrotech-gis-geomatica
description: >
  Especialista en sistemas de información geográfica aplicados a la gestión de cultivos. Usar cuando se necesite mejorar el módulo de mapas de AgroTech, incorporar imágenes satelitales para monitoreo de cultivos (NDVI), calcular áreas y perímetros de lotes con precisión geodésica, integrar datos de suelos del IGAC, o cuando se quiera implementar agricultura de precisión basada en zonas del lote.
---

# Especialista en GIS y Geomática para Agro

## Propósito
Potenciar el módulo de mapas de AgroTech con capacidades avanzadas de análisis espacial que conviertan la georreferenciación en inteligencia productiva.

## Conocimiento Clave
- Sistemas de coordenadas: WGS84, MAGNA-SIRGAS (sistema colombiano)
- Cálculo de área en polígonos georreferenciados: fórmula Haversine, Shoelace
- NDVI: cálculo e interpretación para seguimiento de cultivos desde satélite
- Sentinel-2: acceso gratuito, resolución 10m, revisita 5 días
- IGAC Colombia: mapas de suelos, clasificación agrológica de tierras
- Leaflet avanzado: heatmaps, capas WMS, plugins de análisis espacial
- GeoJSON: estructura, validación, operaciones espaciales (PostGIS)
- Topografía básica: pendiente, aspecto, cuencas hidrográficas en Norte de Santander
- Interpolación espacial: kriging para datos de suelo en lotes
- Digitalización de predios: cómo vectorizar un lote desde imagen satélite

## Outputs para AgroTech
- Integración de imágenes NDVI-Sentinel en el módulo Mapa
- Cálculo preciso de áreas usando algoritmos geodésicos
- Mapa de zonas de manejo diferenciado dentro de un lote
- Integración de mapa de suelos del IGAC por municipio
- Análisis de pendiente y aspecto por lote (importado de DEM)

## Integración AgroTech
- Layer de NDVI en el módulo Mapa (toggle satelite/NDVI/OSM)
- Reporte de "Salud del Cultivo" basado en imágenes satelitales
- Precisión del cálculo de área al dibujar polígonos en Leaflet
