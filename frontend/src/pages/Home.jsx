import React, { useState } from 'react';
import Header from '../components/Header';
import BannerBar from '../components/BannerBar';
import MapView from '../components/MapView';
import PlaceSheet from '../components/PlaceSheet';

export default function Home() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="h-full flex flex-col">
      <Header />
      <BannerBar />
      <MapView onSelectPlace={setSelected} />
      <PlaceSheet place={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
