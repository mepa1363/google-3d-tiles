import React, { useState } from "react";
import { scaleLinear } from "d3-scale";
import { createRoot } from "react-dom/client";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import {
  DataFilterExtension,
  _TerrainExtension as TerrainExtension,
} from "@deck.gl/extensions";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY; // eslint-disable-line
const TILESET_URL = "https://tile.googleapis.com/v1/3dtiles/root.json";

export const COLORS = [
  [255, 247, 243],
  [253, 224, 221],
  [252, 197, 192],
  [250, 159, 181],
  [247, 104, 161],
  [221, 52, 151],
  [174, 1, 126],
  [122, 1, 119],
];

const colorScale = scaleLinear()
  .clamp(true)
  .domain([0, 15, 30, 45, 60, 75, 90, 105, 120])
  .range(COLORS);

const INITIAL_VIEW_STATE = {
  latitude: 34.26173,
  longitude: -118.75033,
  zoom: 15,
  minZoom: 0,
  maxZoom: 18,
  pitch: 20,
};

const FLOOD_ZONE_DATA = "./data/tuflow_zones.geojson";
const PROJECT_BOUNDS = "./data/tuflow_bounds.geojson";

// Color Scale Component
const ColorScale = () => {
  return (
    <div>
      <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
        Flood Depth
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span>Low</span>
        <div
          style={{
            display: "flex",
            marginLeft: "10px",
            marginRight: "10px",
            marginBottom: "10px",
          }}
        >
          {COLORS.map((color, index) => (
            <div
              key={index}
              style={{
                backgroundColor: `rgb(${color.join(",")})`,
                width: "20px",
                height: "20px",
              }}
            />
          ))}
        </div>
        <span>High</span>
      </div>
    </div>
  );
};

// Opacity Control Component
const OpacityControl = ({ onChange, value }) => {
  return (
    <div style={{ marginTop: "20px", display: "flex", alignItems: "center" }}>
      <label
        style={{ display: "flex", alignItems: "center", fontWeight: "bold" }}
      >
        Opacity
        <input
          style={{ marginLeft: "10px" }}
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </label>
    </div>
  );
};

// Extrusion Control Component
const ExtrusionControl = ({ onChange, value }) => {
  return (
    <div style={{ marginTop: "20px", display: "flex", alignItems: "center" }}>
      <label
        style={{ display: "flex", alignItems: "center", fontWeight: "bold" }}
      >
        Enable extrusion
        <input
          style={{ marginLeft: "10px" }}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    </div>
  );
};

// Elevation Multiplier Control Component
const ElevationMultiplierControl = ({ onChange, value }) => {
  return (
    <div style={{ marginTop: "20px", display: "flex", alignItems: "center" }}>
      <label
        style={{ display: "flex", alignItems: "center", fontWeight: "bold" }}
      >
        Scale factor
        <input
          style={{ marginLeft: "10px" }}
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </label>
    </div>
  );
};

export default function App({ data = TILESET_URL, depth = 0 }) {
  const [credits, setCredits] = useState("");
  const [opacity, setOpacity] = useState(0.2);
  const [extruded, setExtruded] = useState(false);
  const [elevationScale, setElevationScale] = useState(0.5);

  const layers = [
    new Tile3DLayer({
      id: "google-3d-tiles",
      data: TILESET_URL,
      onTilesetLoad: (tileset3d) => {
        tileset3d.options.onTraversalComplete = (selectedTiles) => {
          const uniqueCredits = new Set();
          selectedTiles.forEach((tile) => {
            const { copyright } = tile.content.gltf.asset;
            copyright.split(";").forEach(uniqueCredits.add, uniqueCredits);
          });
          setCredits([...uniqueCredits].join("; "));
          return selectedTiles;
        };
      },
      loadOptions: {
        fetch: { headers: { "X-GOOG-API-KEY": GOOGLE_MAPS_API_KEY } },
      },
      operation: "terrain+draw",
    }),
    new GeoJsonLayer({
      id: "project_boundaries",
      data: PROJECT_BOUNDS,
      extensions: [
        new DataFilterExtension({ filterSize: 1 }),
        new TerrainExtension(),
      ],
      stroked: false,
      filled: true,
      extruded: extruded,
      getFillColor: ({ properties }) => colorScale(properties.flood_depth),
      opacity,
      getFilterValue: (f) => f.properties.flood_depth,
      filterRange: [depth, 20],
      getElevation: ({ properties }) => properties.flood_depth,
      elevationScale: elevationScale,
    }),
    new GeoJsonLayer({
      id: "flood_zones",
      data: FLOOD_ZONE_DATA,
      extensions: [
        new DataFilterExtension({ filterSize: 1 }),
        new TerrainExtension(),
      ],
      stroked: false,
      filled: true,
      extruded: extruded,
      getFillColor: ({ properties }) => colorScale(properties.flood_depth),
      opacity,
      getFilterValue: (f) => f.properties.flood_depth,
      filterRange: [depth, 120],
      getElevation: ({ properties }) => properties.flood_depth,
      elevationScale: elevationScale,
    }),
  ];

  return (
    <div>
      <DeckGL
        style={{ backgroundColor: "#061714" }}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
      />
      <div
        style={{
          position: "absolute",
          left: "8px",
          bottom: "4px",
          color: "white",
          fontSize: "10px",
        }}
      >
        {credits}
      </div>
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 1,
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "5px",
        }}
      >
        <ColorScale opacity={opacity} />
        <OpacityControl value={opacity} onChange={setOpacity} />
        <ExtrusionControl value={extruded} onChange={setExtruded} />
        <ElevationMultiplierControl
          value={elevationScale}
          onChange={setElevationScale}
        />
      </div>
    </div>
  );
}

export function renderToDOM(container) {
  createRoot(container).render(<App />);
}
