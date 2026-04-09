import { ImageResponse } from "next/og";

export const alt = "DeFlaky — Detect & Fix Flaky Tests";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0a",
          padding: "0",
        }}
      >
        {/* Top green accent line */}
        <div
          style={{
            width: "100%",
            height: "4px",
            backgroundColor: "#4ade80",
          }}
        />

        {/* Main content area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flexGrow: 1,
            padding: "60px 80px",
          }}
        >
          {/* Logo row: green box with "df" + "DeFlaky" text */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "40px",
            }}
          >
            {/* Green rounded square with "df" */}
            <div
              style={{
                width: "120px",
                height: "120px",
                backgroundColor: "#4ade80",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "28px",
              }}
            >
              <span
                style={{
                  fontSize: "64px",
                  fontWeight: 700,
                  color: "#000000",
                }}
              >
                df
              </span>
            </div>

            {/* "DeFlaky" brand text */}
            <span
              style={{
                fontSize: "72px",
                fontWeight: 700,
                color: "#ffffff",
              }}
            >
              DeFlaky
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: "42px",
              fontWeight: 600,
              color: "#ffffff",
              marginBottom: "20px",
            }}
          >
            Detect & Fix Flaky Tests
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: "26px",
              fontWeight: 400,
              color: "#a1a1aa",
              marginBottom: "40px",
            }}
          >
            Open-source CLI + Dashboard for test reliability
          </div>

          {/* Bottom green accent line */}
          <div
            style={{
              width: "200px",
              height: "3px",
              backgroundColor: "#4ade80",
              opacity: 0.6,
              borderRadius: "2px",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
