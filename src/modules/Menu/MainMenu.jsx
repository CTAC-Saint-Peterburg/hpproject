import React, { useState } from 'react';
import {
  Box, Button, Select, MenuItem, Typography, Paper
} from '@mui/material';
import { useGameStore } from '../Stores/GameStore';
import menuConfig from '../../static/menu.json'

export default function MainMenu() {
  const [bgColor, setBgColor] = useState(menuConfig.defaultBgColor);
  const { selectedLevel, selectedLang, setLevel, setLang, setStartGame } = useGameStore();

  const handlePlay = () => {
    console.log('🎮 Играть нажата');
    console.log('Выбранный уровень:', selectedLevel);
    console.log('Язык:', selectedLang);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 3,
        gap: 3,
        transition: 'background-color 0.3s ease'
      }}
    >
      {/* 🎨 Смена цвета фона
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'white' }}>Цвет фона:</Typography>
        <input
          type="color"
          value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
          style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }}
        />
      </Box> */}

      {/* 📐 Выбор уровня (горизонтальный скролл) */}
      <Box sx={{ width: '100%', maxWidth: 600 }}>
        <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>Уровень</Typography>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 2,
            scrollSnapType: 'x mandatory',
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 4 }
          }}
        >
          {menuConfig.levels.map((level) => (
            <Paper
              key={level.id}
              onClick={() => setLevel(level.id)}
              sx={{
                minWidth: 80,
                height: 80,
                backgroundColor: level.color,
                borderRadius: 3,
                cursor: 'pointer',
                border: selectedLevel === level.id ? '3px solid white' : '2px solid transparent',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'scale(1.05)' },
                scrollSnapAlign: 'center'
              }}
            />
          ))}
        </Box>
      </Box>

      {/* 🌍 Выбор языка */}
      <Box sx={{ width: '100%', maxWidth: 300 }}>
        <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>Язык</Typography>
        <Select
          fullWidth
          value={selectedLang}
          onChange={(e) => setLang(e.target.value)}
          sx={{
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: 2,
            '& .MuiSelect-select': { py: 1.5 }
          }}
        >
          {menuConfig.languages.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>{lang.name}</MenuItem>
          ))}
        </Select>
      </Box>

      {/* 🔘 Кнопки Туториал / Опции */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 300 }}>
        <Button
          variant="outlined"
          onClick={() => console.log('📖 Туториал')}
          sx={{ color: 'white', borderColor: 'white', py: 1.5, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
        >
          {menuConfig.menuItems.tutorial}
        </Button>
        <Button
          variant="outlined"
          onClick={() => console.log('⚙️ Опции')}
          sx={{ color: 'white', borderColor: 'white', py: 1.5, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
        >
          {menuConfig.menuItems.options}
        </Button>
      </Box>

      {/* ▶️ Кнопка Играть */}
      <Button
        variant="contained"
        size="large"
        disabled={!selectedLevel}
        onClick={()=> setStartGame(1)}
        sx={{
          backgroundColor: '#FFD700',
          color: '#1a1a1a',
          fontSize: '1.4rem',
          fontWeight: 800,
          py: 2.5,
          px: 6,
          borderRadius: 4,
          '&:hover': { backgroundColor: '#FFC107' },
          '&:disabled': { backgroundColor: '#9E9E9E', color: '#616161' }
        }}
      >
        {menuConfig.menuItems.play}
      </Button>
    </Box>
  );
}