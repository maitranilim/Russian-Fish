import React from 'react';
import { CardModel } from '../types';
import { getSuitSymbol } from '../utils';

interface CardProps {
  card?: CardModel;
  isHidden?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  isPlayable?: boolean;
  className?: string;
  vertical?: boolean; // For East/West players
  style?: React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ 
  card, 
  isHidden = false, 
  onClick, 
  disabled = false,
  isPlayable = false,
  className = '',
  vertical = false,
  style
}) => {
  
  // Base dimensions
  const baseClasses = vertical 
    ? "w-24 h-16 sm:w-28 sm:h-20" // Rotated aspect (wider than tall visually if we just rotate container, but here we explicitly size)
    : "w-16 h-24 sm:w-20 sm:h-28";

  // If hidden, show card back
  if (isHidden) {
    return (
      <div 
        style={style}
        onClick={!disabled ? onClick : undefined}
        className={`relative ${baseClasses} bg-slate-700 rounded-lg border-2 border-slate-600 shadow-xl flex items-center justify-center transition-all duration-300 ${className}`}
      >
        <div className="absolute inset-2 bg-slate-800 rounded opacity-50 patterned-back"></div>
        {/* Simple pattern for card back */}
        <div className="w-4 h-4 rounded-full bg-slate-600/30"></div>
      </div>
    );
  }

  if (!card) return null;

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const symbol = getSuitSymbol(card.suit);

  return (
    <div 
      style={style}
      onClick={!disabled ? onClick : undefined}
      className={`
        relative ${baseClasses} rounded-lg shadow-xl flex flex-col justify-between p-1.5 select-none transition-all duration-200
        ${disabled ? 'cursor-default' : 'cursor-pointer hover:-translate-y-2'}
        ${isPlayable ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900 z-10' : ''}
        bg-slate-100
        ${className}
      `}
    >
      <div className={`text-sm sm:text-base font-bold leading-none ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        {card.rank}
        <div className="text-xs">{symbol}</div>
      </div>
      
      <div className={`absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl opacity-20 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        {symbol}
      </div>

      <div className={`text-sm sm:text-base font-bold leading-none transform rotate-180 ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
        {card.rank}
        <div className="text-xs">{symbol}</div>
      </div>
    </div>
  );
};

export default Card;