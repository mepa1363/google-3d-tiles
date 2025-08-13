// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import React, { useState } from "react";
import { scaleLinear } from "d3-scale";
import { createRoot } from "react-dom/client";
import { DeckGL } from "@deck.gl/react";
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
  bearing: 0,
  pitch: 0,
};

const FLOOD_ZONE_DATA = "/tuflow_zones.geojson";

function getTooltip({ object }) {
  return (
    object && {
      html: `\
    <div><b>Flood Depth</b></div>
    <div>${object.properties.flood_depth} meters</div>
    `,
    }
  );
}

export default function App({ data = TILESET_URL, depth = 0, opacity = 0.2 }) {
  const [credits, setCredits] = useState("");
  const [opacityValue, setOpacity] = useState(opacity);

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
      id: "flood_zones",
      data: FLOOD_ZONE_DATA,
      extensions: [
        new DataFilterExtension({ filterSize: 1 }),
        new TerrainExtension(),
      ],
      stroked: false,
      filled: true,
      getFillColor: ({ properties }) => colorScale(properties.flood_depth),
      opacity: opacityValue,
      getFilterValue: (f) => f.properties.flood_depth,
      filterRange: [depth, 120],
      pickable: true,
    }),
  ];

  return (
    <div>
      <DeckGL
        style={{ backgroundColor: "#061714" }}
        initialViewState={INITIAL_VIEW_STATE}
        controller={{ touchRotate: true, inertia: 250 }}
        layers={layers}
        getTooltip={getTooltip}
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
        <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
          Flood Depth Legend
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <span>Low</span>
          <div
            style={{
              display: "flex",
              marginLeft: "10px",
              marginRight: "10px",
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
        <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
          Flood Zone Opacity
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              fontWeight: "bold",
            }}
          >
            Opacity
            <input
              style={{ marginLeft: "10px" }}
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={opacityValue}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export function renderToDOM(container) {
  createRoot(container).render(<App />);
}
