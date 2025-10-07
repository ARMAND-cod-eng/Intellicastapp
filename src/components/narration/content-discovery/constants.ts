/**
 * Shared constants for AI Content Discovery feature
 */

import { Globe, Laptop, Briefcase, Microscope, Heart, Film, Trophy } from 'lucide-react';
import type { VoiceOption, CategoryOption } from './types';

export const ALL_VOICES: VoiceOption[] = [
  { id: '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30', name: 'Linda', desc: 'Professional & Clear', gender: 'female', accent: 'American' },
  { id: 'e07c00bc-4134-4eae-9ea4-1a55fb45746b', name: 'Brooke', desc: 'Friendly & Approachable', gender: 'female', accent: 'American' },
  { id: 'f786b574-daa5-4673-aa0c-cbe3e8534c02', name: 'Katie', desc: 'Young & Energetic', gender: 'female', accent: 'American' },
  { id: '694f9389-aac1-45b6-b726-9d9369183238', name: 'Sarah', desc: 'Calm & Soothing', gender: 'female', accent: 'American' },
  { id: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc', name: 'Jacqueline', desc: 'Elegant & Refined', gender: 'female', accent: 'British' },
  { id: 'f9836c6e-a0bd-460e-9d3c-f7299fa60f94', name: 'Caroline', desc: 'Dynamic & Confident', gender: 'female', accent: 'American' },
  { id: '5ee9feff-1265-424a-9d7f-8e4d431a12c7', name: 'Ronald', desc: 'Authoritative Thinker', gender: 'male', accent: 'British' },
  { id: 'a167e0f3-df7e-4d52-a9c3-f949145efdab', name: 'Blake', desc: 'Helpful & Energetic', gender: 'male', accent: 'American' },
  { id: '248be419-c632-4f23-adf1-5324ed7dbf1d', name: 'Elizabeth', desc: 'Warm & Professional', gender: 'female', accent: 'American' },
  { id: '5c5ad5e7-1020-476b-8b91-fdcbe9cc313c', name: 'Daniela', desc: 'Relaxed & Friendly', gender: 'female', accent: 'Spanish' }
];

export const CATEGORIES: CategoryOption[] = [
  { id: 'all', name: 'All Topics', icon: Globe },
  { id: 'technology', name: 'Technology', icon: Laptop },
  { id: 'business', name: 'Business', icon: Briefcase },
  { id: 'science', name: 'Science', icon: Microscope },
  { id: 'health', name: 'Health', icon: Heart },
  { id: 'entertainment', name: 'Entertainment', icon: Film },
  { id: 'sports', name: 'Sports', icon: Trophy },
];

export const DEFAULT_HOST_VOICE = '829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30'; // Linda
export const DEFAULT_GUEST_VOICE = 'e07c00bc-4134-4eae-9ea4-1a55fb45746b'; // Brooke
export const DEFAULT_VOICE_SPEED = 1.0;
export const DEFAULT_PODCAST_LENGTH = '10min';
export const DEFAULT_ARTWORK_URL = 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400';
