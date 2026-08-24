import { useState } from 'react';
import type { Flight } from '../types';
import { useUser } from './useUser';

export const useBookingFlow = (onBookingComplete: () => void) => {
  const { user } = useUser();
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const handleBookFlight = (flight: Flight) => {
    setSelectedFlight(flight);
    if (!user) {
      setShowUserModal(true);
    } else {
      setShowBookingModal(true);
    }
  };

  const handleUserIdentified = () => {
    setShowBookingModal(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingModal(false);
    onBookingComplete();
  };

  return {
    selectedFlight,
    showUserModal,
    setShowUserModal,
    showBookingModal,
    setShowBookingModal,
    handleBookFlight,
    handleUserIdentified,
    handleBookingSuccess,
  };
};
