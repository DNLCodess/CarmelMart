"use client";

import { Component } from "react";

// Wraps each landing section individually so one crash doesn't kill the whole page.
// Logs the full error + section name to the browser console for production debugging.
export default class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(
      `[CarmelMart] Section crash — "${this.props.name}"`,
      "\nError:", error?.message,
      "\nStack:", error?.stack,
      "\nComponent trace:", info?.componentStack,
    );
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
