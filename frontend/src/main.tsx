import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AffinityDiagramApp from './modules/AffinityDiagramApp';

createRoot(document.getElementById('root')!).render(<AffinityDiagramApp />);
