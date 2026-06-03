'use client';

import { createContext } from "react";

type DemoType = 'demo' | 'pepo';

const DemonContext = createContext<DemoType | null>(null);