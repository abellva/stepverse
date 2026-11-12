import { useEffect, useMemo, useState } from "react"
import DashboardPage from "./pages/DashboardPage"
import DecompositionPage from "./pages/DecompositionPage"
import IpoAnalysisPage from "./pages/IpoAnalysisPage"
import KinestheticPage from "./pages/KinestheticPage"
import LoginPage from "./pages/LoginPage"
import VideoOrientationPage from "./pages/VideoOrientationPage"

type RouteKey = "login" | "dashboard" | "video" | "analysis" | "decomposition" | "kinesthetic"

const routes: Array<{
  key: RouteKey
  label: string
  component: () => React.JSX.Element
}> = [
  { key: "login", label: "Masuk", component: LoginPage },
  { key: "dashboard", label: "Modul", component: DashboardPage },
  { key: "video", label: "Orientasi", component: VideoOrientationPage },
  { key: "analysis", label: "Analisis IPO", component: IpoAnalysisPage },
  { key: "decomposition", label: "Dekomposisi", component: DecompositionPage },
  { key: "kinesthetic", label: "Simulasi", component: KinestheticPage },
]

function routeFromHash(): RouteKey {
  const hash = window.location.hash.replace("#/", "") as RouteKey
  return routes.some((route) => route.key === hash) ? hash : "login"
}

function navigate(route: RouteKey) {
  window.location.hash = `/${route}`
}

function destinationFromText(text: string): RouteKey | null {
  if (text.includes("Masuk ke Ruang Belajar")) return "dashboard"
  if (text.includes("Lanjutkan Belajar")) return "video"
  if (text.includes("Saya sudah paham masalahnya")) return "analysis"
  if (text.includes("Lanjut ke Tahap 2")) return "decomposition"
  if (text.includes("Periksa Peta")) return "kinesthetic"
  if (text.includes("Kami Sudah Selesai")) return "dashboard"
  return null
}

export default function App() {
  const [route, setRoute] = useState<RouteKey>(routeFromHash)
  const [showNavigator, setShowNavigator] = useState(false)
  const ActivePage = useMemo(
    () => routes.find((item) => item.key === route)?.component ?? LoginPage,
    [route],
  )

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromHash())
    window.addEventListener("hashchange", syncRoute)
    return () => window.removeEventListener("hashchange", syncRoute)
  }, [])

  const handleFlowClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const actionable = target.closest(
      '[data-name*="Button"], [data-name*="Link"]',
    )
    if (!actionable) return

    const destination = destinationFromText(actionable.textContent ?? "")
    if (destination) navigate(destination)
  }

  return (
    <div className="app-shell" onClick={handleFlowClick}>
      <ActivePage />

      <aside className={`page-navigator ${showNavigator ? "is-open" : ""}`}>
        <button
          aria-expanded={showNavigator}
          className="page-navigator__toggle"
          onClick={(event) => {
            event.stopPropagation()
            setShowNavigator((visible) => !visible)
          }}
          type="button"
        >
          <span className="page-navigator__dot" />
          {showNavigator ? "Tutup halaman" : "Lihat semua halaman"}
        </button>
        {showNavigator && (
          <nav
            aria-label="Daftar halaman desain"
            className="page-navigator__list"
          >
            {routes.map((item, index) => (
              <button
                aria-current={item.key === route ? "page" : undefined}
                className={item.key === route ? "is-active" : ""}
                key={item.key}
                onClick={(event) => {
                  event.stopPropagation()
                  navigate(item.key)
                  setShowNavigator(false)
                }}
                type="button"
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </aside>
    </div>
  )
}
