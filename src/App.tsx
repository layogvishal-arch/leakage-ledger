import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DataProvider } from './state/DataContext'
import { Landing } from './screens/Landing'
import { CommandCenter } from './screens/CommandCenter'
import { VendorOnboarding } from './screens/VendorOnboarding'
import { Waterfall } from './screens/Waterfall'
import { SystemOfRecord } from './screens/SystemOfRecord'
import { ReplyAnalysis } from './screens/ReplyAnalysis'
import { UnitEconomics } from './screens/UnitEconomics'
import { AgentChat } from './screens/AgentChat'
import { ClaimExport } from './screens/ClaimExport'

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/command-center" element={<CommandCenter />} />
            <Route path="/onboarding" element={<VendorOnboarding />} />
            <Route path="/waterfall" element={<Waterfall />} />
            <Route path="/system-of-record" element={<SystemOfRecord />} />
            <Route path="/reply-analysis" element={<ReplyAnalysis />} />
            <Route path="/unit-economics" element={<UnitEconomics />} />
            <Route path="/agent-chat" element={<AgentChat />} />
            <Route path="/claim-export" element={<ClaimExport />} />
          </Routes>
        </Layout>
      </HashRouter>
    </DataProvider>
  )
}
