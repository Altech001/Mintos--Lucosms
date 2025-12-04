/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { africaMill } from "@react-jvectormap/africa";
import { VectorMap } from "@react-jvectormap/core";
import { useEffect, useRef } from 'react';

interface UgandaMapProps {
  mapColor?: string;
  highlightColor?: string;
  onRegionClick?: (code: string, name: string) => void;
}

const UgandaMap: React.FC<UgandaMapProps> = ({
  mapColor = "#E5E7EB",
  highlightColor = "#10B981",
  onRegionClick
}) => {
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setFocus({ region: "UG", animate: true });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-900/50">
      <VectorMap
        map={africaMill}
        // containerClassName="w-full h-full"
        backgroundColor="transparent"
        // ref={mapRef}
        zoomOnScroll={true}
        zoomMax={20}
        zoomMin={1}
        zoomStep={1.5}
        zoomAnimate={true}
        focusOn={{
          region: "UG",
          animate: true,
          scale: 5,
          x: 0.5,
          y: 0.5
        }}
        regionStyle={{
          initial: {
            fill: mapColor,
            fillOpacity: 1,
            stroke: "#fff",
            strokeWidth: 0.5,
            strokeOpacity: 0.3,
          },
          hover: {
            fillOpacity: 0.8,
            cursor: "pointer",
            fill: "#6B7280",
          },
          selected: {
            fill: highlightColor,
            stroke: "#fff",
            strokeWidth: 1.5,
          },
        }}
        selectedRegions={["UG"]}
        onRegionTipShow={(_e, el: any, code) => {
          if (code === "UG") {
            el.html(`
              <div class="font-medium text-emerald-600 dark:text-emerald-400">
                Uganda
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">
                East Africa • Population: ~47M
              </div>
            `);
          }
        }}
        onRegionClick={(_e, code) => {
          if (code === "UG") {
            onRegionClick?.("UG", "Uganda");
          }
        }}
        markers={[
          {
            latLng: [0.3136, 32.5811],
            name: "Kampala",
          }
        ]}
        markerStyle={{
          initial: {
            fill: "#EF4444",
            stroke: "#fff",
            strokeWidth: 2,
          },
          hover: {
            fill: "#DC2626",
          },
          selected: {
            fill: "#991B1B",
          }
        }}
        labels={{
          markers: {
            render: () => {
              return `
                <div class="flex items-center gap-1 text-xs font-semibold">
                  <span class="w-4 h-3">
                    <svg viewBox="0 0 640 480" class="w-full h-full">
                    <rect y="320" width="640" height="160" fill="#D21034"/>
                      <rect width="640" height="480" fill="#FFD500"/>
                      <rect y="160" width="640" height="160" fill="#000"/>
                      <circle cx="320" cy="240" r="80" fill="#fff"/>
                      <path d="M320 180v120M260 240h120" stroke="#000" strokeWidth="20"/>
                    </svg>
                  </span>
                  Kampala
                </div>
              `;
            },
            offsets: () => ({})
          }
        }}
      />

      {/* Uganda Flag Badge (Top Right) */}
      <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex items-center gap-2 border border-gray-200 dark:border-gray-700">
        <div className="w-8 h-6 rounded overflow-hidden shadow">
          <svg viewBox="0 0 640 480" className="w-full h-full">
            <rect width="640" height="480" fill="#D21034" />
            <rect y="160" width="640" height="160" fill="#000" />
            <rect y="320" width="640" height="160" fill="#FFD500" />
            <circle cx="320" cy="240" r="80" fill="#fff" />
            <path d="M320 180v120M260 240h120" stroke="#000" strokeWidth="20" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-800 dark:text-white">Uganda</span>
      </div>

      {/* Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span>Uganda (Selected)</span>
        </div>
      </div>
    </div>
  );
};

export default UgandaMap;