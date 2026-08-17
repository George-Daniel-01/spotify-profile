import React, { useState, useEffect, useRef } from 'react';
import {
  getTopTracksShort,
  getTopTracksMedium,
  getTopTracksLong,
  getTopArtistsShort,
  getTopArtistsMedium,
  getTopArtistsLong,
} from '../spotify';
import { featuresFromArtists } from '../utils/genreFeatures';
import Chart from 'chart.js';

import Loader from './Loader';

import styled from 'styled-components';
import { theme, mixins, media } from '../styles';
const { colors, fontSizes, spacing, fonts } = theme;

const Container = styled.div`
  margin-bottom: ${spacing.lg};
`;
const Title = styled.h3`
  font-size: ${fontSizes.lg};
  margin: 0 0 ${spacing.xs};
  color: ${colors.white};
`;
const Subtitle = styled.p`
  color: ${colors.lightGrey};
  font-size: ${fontSizes.sm};
  margin: 0 0 ${spacing.base};
`;
const ChartCanvas = styled.canvas`
  max-height: 350px;
`;
const Legend = styled.div`
  display: flex;
  justify-content: center;
  gap: ${spacing.base};
  margin-top: ${spacing.base};
  flex-wrap: wrap;
`;
const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
  color: ${colors.lightestGrey};
  font-size: ${fontSizes.xs};
`;
const LegendDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${props => props.color};
`;

const ListeningHabits = () => {
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const build = async () => {
      try {
        setLoading(true);
        const getFeatures = async artistGetter => {
          const { data } = await artistGetter();
          return featuresFromArtists(data);
        };
        const [short, medium, long] = await Promise.all([
          getFeatures(getTopArtistsShort),
          getFeatures(getTopArtistsMedium),
          getFeatures(getTopArtistsLong),
        ]);
        if (cancelled) return;
        setFeatures({ short, medium, long });
      } catch (err) {
        console.error('Error building listening habits chart:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    build();
    return () => {
      cancelled = true;
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (!features) return;
    const raf = requestAnimationFrame(() => {
      if (chartInstance.current) chartInstance.current.destroy();
      const ctx = chartRef.current;
      if (!ctx) return;

      const { short, medium, long } = features;
      const labels = ['Energy', 'Danceability', 'Valence', 'Acousticness'];

      try {
        chartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Last 4 Weeks',
                data: [short.energy, short.danceability, short.valence, short.acousticness],
                borderColor: colors.green,
                backgroundColor: 'rgba(29, 185, 84, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: colors.green,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                tension: 0.4,
                fill: true,
              },
              {
                label: 'Last 6 Months',
                data: [medium.energy, medium.danceability, medium.valence, medium.acousticness],
                borderColor: colors.blue,
                backgroundColor: 'rgba(80, 155, 245, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: colors.blue,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                tension: 0.4,
                fill: true,
              },
              {
                label: 'All Time',
                data: [long.energy, long.danceability, long.valence, long.acousticness],
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#ff6384',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                tension: 0.4,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            title: { display: false },
            legend: { display: false },
            scales: {
              xAxes: [
                {
                  gridLines: { color: 'rgba(255,255,255,0.05)' },
                  ticks: {
                    font: { family: fonts.primary, size: 13 },
                    fontColor: '#b3b3b3',
                  },
                },
              ],
              yAxes: [
                {
                  gridLines: { color: 'rgba(255,255,255,0.05)' },
                  ticks: {
                    beginAtZero: true,
                    max: 1,
                    font: { family: fonts.primary, size: 12 },
                    fontColor: '#b3b3b3',
                  },
                },
              ],
            },
          },
        });
      } catch (e) {
        console.error('LH chart creation error:', e);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [features]);

  return (
    <Container>
      <Title>How Your Taste Evolves</Title>
      <Subtitle>Compare your audio features across 4 weeks, 6 months, and all time</Subtitle>
      {loading ? (
        <Loader />
      ) : (
        <>
          <ChartCanvas ref={chartRef} />
          <Legend>
            <LegendItem>
              <LegendDot color={colors.green} />
              Last 4 Weeks
            </LegendItem>
            <LegendItem>
              <LegendDot color={colors.blue} />
              Last 6 Months
            </LegendItem>
            <LegendItem>
              <LegendDot color="#ff6384" />
              All Time
            </LegendItem>
          </Legend>
        </>
      )}
    </Container>
  );
};

export default ListeningHabits;
