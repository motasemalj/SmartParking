'use client';

import React from 'react';

interface PlatePreviewProps {
  plateCode: string;
  plateNumber: string;
  country: string;
  emirate?: string;
  type: string;
}

const UAE_EMIRATES = {
  'ABU DHABI': {
    name: 'Abu Dhabi',
    arabicName: 'أبوظبي',
    plateStyle: 'abu_dhabi'
  },
  'DUBAI': {
    name: 'Dubai',
    arabicName: 'دبي',
    plateStyle: 'dubai'
  },
  'SHARJAH': {
    name: 'Sharjah',
    arabicName: 'الشارقة',
    plateStyle: 'sharjah'
  },
  'AJMAN': {
    name: 'Ajman',
    arabicName: 'عجمان',
    plateStyle: 'ajman'
  },
  'UMM AL QUWAIN': {
    name: 'Umm Al Quwain',
    arabicName: 'ام القيوين',
    plateStyle: 'uaq'
  },
  'RAS AL KHAIMAH': {
    name: 'Ras Al Khaimah',
    arabicName: 'رأس الخيمة',
    plateStyle: 'rak'
  },
  'FUJAIRAH': {
    name: 'Fujairah',
    arabicName: 'الفجيرة',
    plateStyle: 'fujairah'
  }
};

const PlateContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-[280px] sm:w-[340px] h-[60px] sm:h-[75px] bg-white border-2 border-black rounded-md flex items-center justify-between px-2 relative shadow-md text-black">
    {children}
  </div>
);

const AbuDhabiPlateContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-[280px] sm:w-[340px] h-[60px] sm:h-[75px] bg-white border-2 border-black rounded-md flex items-stretch justify-start relative shadow-md text-black overflow-hidden">
        {children}
    </div>
);

const GenericPlateContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-[280px] sm:w-[340px] h-[60px] sm:h-[75px] bg-white border-2 border-black rounded-md flex items-center justify-between px-4 relative shadow-md text-black">
    {children}
  </div>
);

const PlateText: React.FC<{ arabic: string; english: string }> = ({ arabic, english }) => (
  <div className="flex flex-col items-center justify-center text-center">
    <span className="font-bold text-sm sm:text-base leading-none">{arabic}</span>
    <span className="text-[9px] sm:text-[11px] font-semibold tracking-tighter leading-none">{english}</span>
  </div>
);

const PlateNumber: React.FC<{ number: string }> = ({ number }) => (
  <div className="font-bold text-4xl sm:text-5xl tracking-wider">{number || ''}</div>
);

const PlateCode: React.FC<{ code: string; className?: string }> = ({ code, className = '' }) => (
  <div className={`font-bold text-4xl sm:text-5xl ${className}`}>{code === 'BLANK' ? '' : (code || '')}</div>
);


const renderPlateContent = (
    plateStyle: string, 
    plateCode: string, 
    plateNumber: string, 
    arabicName: string,
    country: string
) => {
  // Generic plate for non-UAE countries
  if (country && country !== 'UAE') {
    return (
      <GenericPlateContainer>
        <div className="w-20 flex justify-center">
          <PlateCode code={plateCode} />
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold">{country}</div>
            <div className="text-xs text-gray-600">License Plate</div>
          </div>
        </div>
        <div className="w-40 flex justify-center">
          <PlateNumber number={plateNumber} />
        </div>
      </GenericPlateContainer>
    );
  }

  switch (plateStyle) {
    case 'abu_dhabi':
      return (
        <AbuDhabiPlateContainer>
          <div className="w-1/5 bg-red-600 flex items-center justify-center shrink-0">
            <PlateCode code={plateCode} className="text-white" />
          </div>
          <div className="flex-grow flex items-center justify-center px-2">
              <div className="w-1/3">
                  <PlateText arabic="الامارات" english="U.A.E A.D" />
              </div>
              <div className="w-2/3 flex justify-center">
                <PlateNumber number={plateNumber} />
              </div>
          </div>
        </AbuDhabiPlateContainer>
      );
    case 'dubai':
      return (
        <PlateContainer>
          <div className="w-28 flex flex-col items-center justify-center">
            <span style={{ transform: 'translateY(4px)' }} className="font-mono text-xl font-bold tracking-widest">DUBAI</span>
            <PlateCode code={plateCode} className="text-xl mt-2" />
          </div>
          <div className="flex-grow flex items-center justify-center ml-8">
            <PlateNumber number={plateNumber} />
          </div>
          <div className="w-28" />
        </PlateContainer>
      );
    case 'sharjah':
      return (
        <PlateContainer>
            <div className="w-16 flex justify-center">
                <PlateCode code={plateCode} className="font-mono" />
            </div>
            <div className="w-32 flex flex-col items-center justify-center text-center">
                <span className="font-bold text-base leading-none">{arabicName}</span>
                <span className="text-[10px] font-semibold tracking-tighter leading-none">U.A.E</span>
                <span className="text-[10px] font-semibold tracking-tighter leading-none">SHARJAH</span>
            </div>
            <div className="w-40 flex justify-center">
             <PlateNumber number={plateNumber} />
            </div>
        </PlateContainer>
      );
    case 'ajman':
      return (
        <PlateContainer>
          <div className="w-16 flex justify-center">
            <PlateCode code={plateCode} />
          </div>
          <div className="w-32 flex items-center justify-center">
            <PlateText arabic={`الامارات ${arabicName}`} english="U.A.E AJMAN" />
          </div>
          <div className="w-40 flex justify-center">
            <PlateNumber number={plateNumber} />
          </div>
        </PlateContainer>
      );
    case 'rak':
      return (
        <PlateContainer>
          <div className="w-16 flex justify-center">
            <PlateCode code={plateCode} />
          </div>
          <div className="w-32 flex items-center justify-center">
            <PlateText arabic={`الامارات ${arabicName}`} english="U.A.E RAK" />
          </div>
          <div className="w-40 flex justify-center">
            <PlateNumber number={plateNumber} />
          </div>
        </PlateContainer>
      );
    case 'fujairah':
       return (
        <PlateContainer>
            <div className="w-16 flex justify-center">
                <PlateCode code={plateCode} />
            </div>
            <div className="w-32 flex flex-col items-center justify-center">
                <span className="text-lg font-bold">U.A.E</span>
                <span className="text-lg font-bold">{arabicName}</span>
            </div>
            <div className="w-40 flex justify-center">
                <PlateNumber number={plateNumber} />
            </div>
        </PlateContainer>
      );
    case 'uaq':
       return (
        <PlateContainer>
            <div className="w-16 flex justify-center">
                <PlateCode code={plateCode} />
            </div>
            <div className="w-32 flex flex-col items-center justify-center">
                <span className="text-lg font-bold tracking-widest">U A E</span>
                <span className="text-lg font-bold">{arabicName}</span>
            </div>
            <div className="w-40 flex justify-center">
                <PlateNumber number={plateNumber} />
            </div>
        </PlateContainer>
      );
    default:
      return null;
  }
};


export default function PlatePreview({ plateCode, plateNumber, country, emirate, type }: PlatePreviewProps) {
  const isUAE = country === 'UAE';
  const emirateData = emirate ? UAE_EMIRATES[emirate as keyof typeof UAE_EMIRATES] : null;

  if (!country) {
    return null;
  }

  if (isUAE && !emirateData) {
    return null;
  }
  
  return (
    <div className="flex flex-col justify-center items-center h-full">
        <div className="transform scale-90">
            {isUAE && emirateData 
              ? renderPlateContent(emirateData.plateStyle, plateCode, plateNumber, emirateData.arabicName, country)
              : renderPlateContent('', plateCode, plateNumber, '', country)
            }
        </div>
    </div>
  );
} 