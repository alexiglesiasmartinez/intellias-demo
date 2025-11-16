import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import styled, { createGlobalStyle, keyframes, ThemeProvider } from 'styled-components';
import { AnimatePresence, motion } from 'framer-motion';
import { useInterval } from './useInterval.js';

// --- Theming ---
const LOG_LEVEL_THEME = {
  INFO: {
    primary: '#007bff',
    hover: '#0056b3',
    textColor: 'white',
  },
  WARNING: {
    primary: '#f39c12',
    hover: '#cf8000ff',
    textColor: 'white',
  },
  ERROR: {
    primary: '#dc3545',
    hover: '#a71d2a',
    textColor: 'white',
  },
  CRITICAL: {
    primary: '#343a40',
    hover: '#23272b',
    textColor: 'white',
  }
};

const darkTheme = {
  body: '#1a1a2e',
  text: '#e0e0e0',
  appContainer: '#24243e',
  panel: '#1e1e34',
  panelBorder: '#404040',
  headerText: '#fff',
  headerTitle: '#f0a500',
  axisText: '#a0a0c0',
  chartBar: '#8884d8'
};

const lightTheme = {
  body: '#f0f2f5',
  text: '#333333',
  appContainer: '#ffffff',
  panel: '#f9f9f9',
  panelBorder: '#e0e0e0',
  headerText: '#555555',
  headerTitle: '#d98c00',
  axisText: '#666666',
  chartBar: '#007bff'
};

// --- Base Styles ---
const GlobalStyle = createGlobalStyle`
  body {
    background-color: ${props => props.theme.body};
    color: ${props => props.theme.text};
    transition: all 0.25s linear;
  }
`;

// --- Framer Motion Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10
    }
  }
};

// --- Styled Components ---

const AppContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  margin: 2rem auto;
  padding: 2rem;
  background: ${props => props.theme.appContainer};
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  box-sizing: border-box;
  transition: all 0.25s linear;

  @media (max-width: 768px) {
    margin: 0rem;
    padding: 1rem;
    max-width: 100%;
  }
`;

const Header = styled(motion.header)`
  width: 100%;
  text-align: center;
  margin-bottom: 1rem;
  position: relative; // Needed for the toggle button
  
  h1 {
    color: ${props => props.theme.headerTitle};
    margin: 0;
    font-size: 2rem;
  }
  
  p {
    font-size: 1.1rem;
    color: ${props => props.theme.headerText};
  }

  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
    h1 { font-size: 1.5rem; }
    p { font-size: 1rem; }
  }
`;

// --- ¡NUEVO BOTÓN DE TEMA! ---
const ThemeToggleButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  background: ${props => props.theme.panel};
  color: ${props => props.theme.text};
  border: 1px solid ${props => props.theme.panelBorder};
  width: 44px; // Tamaño fijo
  height: 44px; // Tamaño fijo
  border-radius: 50%; // Redondo
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
  overflow: hidden; // Oculta el icono que está "fuera"

  &:hover {
    background: ${props => props.theme.appContainer};
    border-color: ${props => props.theme.text};
  }

  @media (max-width: 768px) {
    top: -5px; // Ajusta la posición en móvil
    right: -5px;
  }
`;

// --- ICONOS SVG ANIMADOS ---
const iconProps = {
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const iconVariants = {
  hidden: { opacity: 0, rotate: -90, scale: 0.5 },
  visible: { opacity: 1, rotate: 0, scale: 1 },
  exit: { opacity: 0, rotate: 90, scale: 0.5 },
};

const iconTransition = { type: 'spring', stiffness: 200, damping: 20 };

const SunIcon = () => (
  <motion.svg
    key="sun"
    {...iconProps}
    initial="hidden"
    animate="visible"
    exit="exit"
    variants={iconVariants}
    transition={iconTransition}
    style={{ position: 'absolute' }} // Permite que se superpongan
  >
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </motion.svg>
);

const MoonIcon = () => (
  <motion.svg
    key="moon"
    {...iconProps}
    initial="hidden"
    animate="visible"
    exit="exit"
    variants={iconVariants}
    transition={iconTransition}
    style={{ position: 'absolute' }} // Permite que se superpongan
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </motion.svg>
);
// --- FIN DE ICONOS ---


const WorkerControl = styled(motion.div)`
  width: 100%;
  background: ${props => props.theme.panel};
  border-radius: 10px;
  margin-bottom: 1.5rem;
  padding: 1rem 1.5rem;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.1);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 1.1rem;
  color: ${props => (props.$isPaused ? LOG_LEVEL_THEME.ERROR.primary : '#28a745')};
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.2; }
  100% { opacity: 1; }
`;

const StatusDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => (props.$isPaused ? LOG_LEVEL_THEME.ERROR.primary : '#28a745')};
  animation: ${props => props.$isPaused ? pulse : 'none'} 2s infinite;
`;

const SimulatorControls = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2.5rem;
  width: 100%;

  @media (max-width: 768px) {
    flex-direction: column;
    margin-bottom: 1.5rem;
  }
`;

const Button = styled.button`
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.color || '#4a4a70'};
  color: white;
  letter-spacing: 1px;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    width: 100%;
    box-sizing: border-box;
  }
`;

const InfoButton = styled(Button)`
  background: ${LOG_LEVEL_THEME.INFO.primary};
  &:hover { background: ${LOG_LEVEL_THEME.INFO.hover}; }
`;

const WarningButton = styled(Button)`
  background: ${LOG_LEVEL_THEME.WARNING.primary};
  &:hover { background: ${LOG_LEVEL_THEME.WARNING.hover}; }
`;

const ErrorButton = styled(Button)`
  background: ${LOG_LEVEL_THEME.ERROR.primary};
  &:hover { background: ${LOG_LEVEL_THEME.ERROR.hover}; }
`;

const CriticalButton = styled(Button)`
  background: ${LOG_LEVEL_THEME.CRITICAL.primary};
  color: ${LOG_LEVEL_THEME.CRITICAL.textColor};
  border: 1px solid #6c757d;
  &:hover { 
    background: ${LOG_LEVEL_THEME.CRITICAL.hover}; 
  }
`;

const PauseButton = styled(Button)`
  background-color: ${props => (props.$isPaused ? '#28a745' : LOG_LEVEL_THEME.WARNING.primary)};
  color: ${props => (props.$isPaused ? 'white' : 'white')};  
  &:hover {
    background-color: ${props => (props.$isPaused ? '#218838' : LOG_LEVEL_THEME.WARNING.hover)};
  }
  
  @media (max-width: 768px) {
    width: 100%;
    box-sizing: border-box;
  }
`;

const ChartWrapper = styled(motion.div)`
  width: 100%;
  height: 400px;
  background: ${props => props.theme.panel};
  padding: 2rem;
  border-radius: 10px;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
  box-sizing: border-box;

  @media (max-width: 768px) {
    height: 300px;
    padding: 1rem;
    padding-left: 0rem;
  }
`;

const NotificationArea = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  width: 320px;

  @media (max-width: 768px) {
    top: 10px;
    right: 10px;
    left: 10px;
    width: auto;
  }
`;

const Notification = styled(motion.div)`
  background: ${props => LOG_LEVEL_THEME[props.$type]?.primary || '#28a745'};
  color: ${props => LOG_LEVEL_THEME[props.$type]?.textColor || 'white'};  
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const QueueStatusContainer = styled(motion.div)`
  width: 100%;
  background: ${props => props.theme.panel};
  border-radius: 10px;
  margin-top: 1.5rem;
  padding: 1.5rem;
  box-sizing: border-box;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
  
  h3 {
    margin: 0 0 1rem 0;
    color: ${props => props.theme.axisText};
    font-weight: 600;
    span {
      color: ${props => props.theme.headerTitle};
      font-size: 1.2em;
    }
  }
`;

const LogIconContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 30px;
`;

const LogIcon = styled(motion.div)`
  width: 24px;
  height: 24px;
  border-radius: 5px;
  background-color: ${props => LOG_LEVEL_THEME[props.$type]?.primary || '#ccc'};
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`;

const DLQStatusContainer = styled(QueueStatusContainer)`
  h3 {
    span {
      color: ${LOG_LEVEL_THEME.ERROR.primary};
    }
  }
`;

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}


function App() {
  
  const [chartData, setChartData] = useState([
    { name: 'INFO', count: 0, fill: LOG_LEVEL_THEME.INFO.primary },
    { name: 'WARNING', count: 0, fill: LOG_LEVEL_THEME.WARNING.primary },
    { name: 'ERROR', count: 0, fill: LOG_LEVEL_THEME.ERROR.primary },
  ]);

  const [toasts, setToasts] = useState([]);
  const [queueStatus, setQueueStatus] = useState({ size: 0, items: [] });
  const [dlqStatus, setDlqStatus] = useState({ size: 0, items: [] });
  const [workerStatus, setWorkerStatus] = useState('running');
  const [theme, setTheme] = useState('dark');
  
  const isMobile = useIsMobile();

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, queueRes, dlqRes, statusRes] = await Promise.all([
        axios.get('/api/stats'),
        axios.get('/api/queue-status'),
        axios.get('/api/dlq-status'),
        axios.get('/api/worker-status')
      ]);

      const stats = statsRes.data;
      setChartData([
        { name: 'INFO', count: stats.INFO || 0, fill: LOG_LEVEL_THEME.INFO.primary },
        { name: 'WARNING', count: stats.WARNING || 0, fill: LOG_LEVEL_THEME.WARNING.primary },
        { name: 'ERROR', count: stats.ERROR || 0, fill: LOG_LEVEL_THEME.ERROR.primary },
      ]);
      
      setQueueStatus({
        size: queueRes.data.queue_size,
        items: queueRes.data.items
      });
      
      setDlqStatus({
        size: dlqRes.data.queue_size,
        items: dlqRes.data.items
      });
      
      setWorkerStatus(statusRes.data.status);

    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, []);

  useInterval(fetchData, 1000);

  const sendSimulatedLog = async (level, message) => {
    let newToast = {};
    try {
      await axios.post('/api/log', { level, message });
      newToast = {
        id: Date.now(),
        message: `Log sent to queue: ${level}`,
        type: level
      };
    } catch (error) {
      console.error("Failed to send log:", error);
      newToast = {
        id: Date.now(),
        message: 'Failed to send log!',
        type: 'ERROR'
      };
    }
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== newToast.id));
    }, 3000);
  };
  
  const togglePause = async () => {
    try {
      if (workerStatus === 'running') {
        await axios.post('/api/pause');
        setWorkerStatus('paused');
      } else {
        await axios.post('/api/resume');
        setWorkerStatus('running');
      }
    } catch (error) {
      console.error("Failed to toggle pause:", error);
    }
  };
  
  const toggleTheme = () => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };
  
  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;
  const isPaused = workerStatus === 'paused';

  const xAxisProps = useMemo(() => {
    if (isMobile) {
      return {
        dataKey: "name",
        stroke: currentTheme.axisText,
        angle: -45,
        textAnchor: "end",
        height: 50,
        interval: 0
      };
    }
    return {
      dataKey: "name",
      stroke: currentTheme.axisText,
      interval: 0
    };
  }, [isMobile, currentTheme]);
  
  const chartMargin = useMemo(() => {
    if (isMobile) {
      return { top: 5, right: 10, left: -20, bottom: 40 };
    }
    return { top: 5, right: 30, left: 20, bottom: 5 };
  }, [isMobile]);

  return (
    <ThemeProvider theme={currentTheme}>
      <GlobalStyle />
      <AppContainer
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Header variants={itemVariants}>
        
          {/* --- ¡BOTÓN DE TEMA ACTUALIZADO! --- */}
          <ThemeToggleButton onClick={toggleTheme} aria-label="Toggle theme">
            <AnimatePresence mode="wait">
              {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
            </AnimatePresence>
          </ThemeToggleButton>
          
          <h1>ETL Intellias Log Dashboard</h1>
          <p>Simulating an asynchronous log processing pipeline</p>
        </Header>

        <WorkerControl variants={itemVariants}>
          <StatusIndicator $isPaused={isPaused}>
            <StatusDot $isPaused={isPaused} />
            ETL Worker Status: {isPaused ? 'PAUSED' : 'RUNNING'}
          </StatusIndicator>
          <PauseButton onClick={togglePause} $isPaused={isPaused}>
            {isPaused ? 'Resume worker' : 'Pause worker'}
          </PauseButton>
        </WorkerControl>

        <SimulatorControls variants={itemVariants}>
          <InfoButton onClick={() => sendSimulatedLog('INFO', 'User login successful')}>
            INFO
          </InfoButton>
          <WarningButton onClick={() => sendSimulatedLog('WARNING', 'Payment gateway timeout')}>
            WARNING
          </WarningButton>
          <ErrorButton onClick={() => sendSimulatedLog('ERROR', 'Database connection failed')}>
            ERROR
          </ErrorButton>
          <CriticalButton onClick={() => sendSimulatedLog('CRITICAL', 'POISON PILL - Corrupt Message')}>
            CRITICAL (Fail)
          </CriticalButton>
        </SimulatorControls>

        <ChartWrapper variants={itemVariants}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={chartMargin} 
            >
              <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.panelBorder} />
              <XAxis {...xAxisProps} />
              <YAxis allowDecimals={false} stroke={currentTheme.axisText} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: currentTheme.appContainer, 
                  borderColor: currentTheme.panelBorder 
                }} 
              />
              <Bar dataKey="count" name="Total processed" fill={currentTheme.chartBar} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <QueueStatusContainer variants={itemVariants}>
          <h3>Unprocessed logs in queue: <span>{queueStatus.size}</span></h3>
          <LogIconContainer>
            <AnimatePresence>
              {queueStatus.items.map(log => (
                <LogIcon
                  key={log.id}
                  $type={log.level}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              ))}
            </AnimatePresence>
          </LogIconContainer>
        </QueueStatusContainer>
        
        <DLQStatusContainer variants={itemVariants}>
          <h3>Dead-letter queue (failed): <span>{dlqStatus.size}</span></h3>
          <LogIconContainer>
            <AnimatePresence>
              {dlqStatus.items.map(log => (
                <LogIcon
                  key={log.id}
                  $type={log.level}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              ))}
            </AnimatePresence>
          </LogIconContainer>
        </DLQStatusContainer>

      </AppContainer>

      <NotificationArea>
        <AnimatePresence>
          {toasts.map(toast => (
            <Notification
              key={toast.id}
              $type={toast.type}
              initial={{ opacity: 0, y: -50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {toast.message}
            </Notification>
          ))}
        </AnimatePresence>
      </NotificationArea>
    </ThemeProvider>
  );
}

export default App;