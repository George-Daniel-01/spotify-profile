import React from 'react';
import styled, { keyframes } from 'styled-components';
import { theme } from '../styles';
const { colors } = theme;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const SkeletonBase = styled.div`
  background: linear-gradient(
    90deg,
    ${colors.darkGrey} 25%,
    ${colors.grey} 50%,
    ${colors.darkGrey} 75%
  );
  background-size: 2000px 100%;
  animation: ${shimmer} 2s infinite linear;
  border-radius: ${props => (props.round ? '50%' : '4px')};
`;

const SkeletonCircle = styled(SkeletonBase)`
  width: ${props => props.size || '50px'};
  height: ${props => props.size || '50px'};
  border-radius: 50%;
`;

const SkeletonRect = styled(SkeletonBase)`
  width: ${props => props.width || '100%'};
  height: ${props => props.height || '20px'};
`;

const SkeletonLine = ({ width, height }) => <SkeletonRect width={width} height={height} />;

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-gap: 20px;
  margin-top: 50px;
`;

const SkeletonCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const SkeletonTrackItem = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  margin-bottom: 20px;
`;

const SkeletonTrackMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-left: 15px;
`;

export const SkeletonArtistGrid = ({ count = 12 }) => (
  <SkeletonGrid>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i}>
        <SkeletonCircle size="200px" />
        <SkeletonLine width="120px" height="16px" />
      </SkeletonCard>
    ))}
  </SkeletonGrid>
);

export const SkeletonTrackList = ({ count = 10 }) => (
  <div style={{ marginTop: '50px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonTrackItem key={i}>
        <SkeletonRect width="50px" height="50px" />
        <SkeletonTrackMeta>
          <SkeletonLine width="200px" height="16px" />
          <SkeletonLine width="150px" height="12px" />
        </SkeletonTrackMeta>
      </SkeletonTrackItem>
    ))}
  </div>
);

export default { SkeletonArtistGrid, SkeletonTrackList };
