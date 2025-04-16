// src/components/common/Loader.js
import React from 'react';
import PropTypes from 'prop-types';
import '../../styles/components/Loader.css';

/**
 * Loader Component
 * 
 * Displays a loading animation with customizable size, color, and text.
 * Can be used as a full-page loader or inline component.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.size='medium'] - Size of the loader
 * @param {string} [props.color='primary'] - Color variant of the loader
 * @param {string} [props.text] - Optional text to display below the loader
 * @param {boolean} [props.fullPage=false] - Whether to display as a full-page overlay
 * @param {boolean} [props.transparent=false] - Whether the background should be transparent
 * @param {string} [props.className] - Additional CSS class names
 */
const Loader = ({
  size = 'medium',
  color = 'primary',
  text,
  fullPage = false,
  transparent = false,
  className = '',
}) => {
  // Determine the CSS classes
  const loaderClasses = [
    'loader',
    `loader-${size}`,
    `loader-${color}`,
    fullPage ? 'loader-full-page' : '',
    transparent ? 'loader-transparent' : '',
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    'loader-container',
    fullPage ? 'loader-container-full' : ''
  ].filter(Boolean).join(' ');

  // Loader with optional text
  const loaderContent = (
    <div className={containerClasses}>
      <div className={loaderClasses}>
        <div className="loader-spinner"></div>
      </div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );

  // If fullPage, wrap in a full-screen overlay
  if (fullPage) {
    return (
      <div className="loader-overlay">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
};

Loader.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  color: PropTypes.oneOf(['primary', 'secondary', 'white']),
  text: PropTypes.string,
  fullPage: PropTypes.bool,
  transparent: PropTypes.bool,
  className: PropTypes.string
};

export default Loader;
