/** @jsxImportSource react */

import { qwikify$ } from "@builder.io/qwik-react";
import { Header as ReactHeader } from "./Header";
import { Footer as ReactFooter } from "./Footer";

export const Footer = qwikify$(ReactFooter);
export const Header = qwikify$(ReactHeader);
