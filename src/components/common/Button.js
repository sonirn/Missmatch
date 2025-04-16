// src/components/common/Button.js
import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import '../../styles/components/Button.css';

/**
 * Button Component
 * 
 * A versatile button component that can be rendered as a button element or a Link.
 * Supports different variants, sizes, and states.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.variant='primary'] - Button style variant
 * @param {string} [props.size='medium'] - Button size
 * @param {string} [props.to] - If provided, renders as a Link to this path
 * @param {string} [props.href] - If provided, renders as an anchor with this href
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 * @param {boolean} [props.fullWidth=false] - Whether the button should take full width
 * @param {boolean} [props.loading=false] - Whether to show loading state
 * @param {string} [props.type='button'] - Button type attribute
 * @param {string} [props.className] - Additional CSS class names
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} [props.onClick] - Click handler
 */
const Button = ({
  variant = 'primary',
  size = 'medium',
  to,
  href,
  disabled = false,
  fullWidth = false,
  loading = false,
  type = 'button',
  className = '',
  children,
  onClick,
  ...rest
}) => {
  // Determine the CSS classes
  const buttonClasses = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'btn-full-width' : '',
    loading ? 'btn-loading' : '',
    className
  ].filter(Boolean).join(' ');

  // If disabled or loading, prevent click
  const handleClick = (e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    
    if (onClick) {
      onClick(e);
    }
  };

  // Render as Link if 'to' prop is provided
  if (to) {
    return (
      <Link
        to={to}
        className={buttonClasses}
        onClick={handleClick}
        tabIndex={disabled ? -1 : undefined}
        {...rest}
      >
        {renderContent()}
      </Link>
    );
  }

  // Render as anchor if 'href' prop is provided
  if (href) {
    return (
      <a
        href={href}
        className={buttonClasses}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={disabled ? -1 : undefined}
        {...rest}
      >
        {renderContent()}
      </a>
    );
  }

  // Render as button by default
  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {renderContent()}
    </button>
  );

  // Helper function to render button content with loading spinner if needed
  function renderContent() {
    if (loading) {
      return (
        <>
          <span className="btn-spinner"></span>
          <span className="btn-text">{children}</span>
        </>
      );
    }
    
    return children;
  }
};

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'tertiary', 'outline', 'danger', 'success', 'text']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  to: PropTypes.string,
  href: PropTypes.string,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  loading: PropTypes.bool,
  type: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func
};

export default Button;
