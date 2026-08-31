import { useEffect } from 'react';
import StudioProvider, { useStudio } from '../studio/StudioProvider';
import AppBar from '../studio/components/AppBar';
import Sidebar from '../studio/components/Sidebar';
import SearchBar from '../studio/components/SearchBar';
import PassageBlock from '../studio/components/PassageBlock';
import PreviewPanel from '../studio/components/PreviewPanel';
import SizeSlider from '../studio/components/SizeSlider';
import AudioProvider from '../studio/AudioProvider';
import AudioLibrary from '../studio/components/AudioLibrary';
import AudioBar from '../studio/components/AudioBar';
import Button from '../studio/ui/Button';

const isTyping = target => target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

const StudioWorkspace = () => {
  const { blocks, loading, clearBlocks, stepLive, clearProjector, tab } = useStudio();

  useEffect(() => {
    const handleKeyDown = e => {
      if (isTyping(e.target)) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          stepLive(1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepLive(-1);
          break;
        case 'Escape':
          clearProjector();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearProjector, stepLive]);

  return (
    <div className="flex h-screen flex-col bg-studio-bg font-ui text-studio-text">
      <AppBar />

      <div className="flex min-h-0 flex-1">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          {tab === 'bible' && <SearchBar />}

          <main className="studio-scroll relative flex-1 overflow-y-auto px-4 pb-28">
            {loading && (
              <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-studio-divider">
                <div className="h-full w-1/3 animate-pulse bg-studio-accent" />
              </div>
            )}

            {tab === 'audio' ? (
              <AudioLibrary />
            ) : blocks.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-medium text-studio-text">No passages yet</p>
                <p className="max-w-sm text-xs text-studio-muted">
                  Search a reference or press Browse to import a whole chapter. Click any verse to send it to the
                  projector; use ← and → to move between verses.
                </p>
              </div>
            ) : (
              <>
                {blocks.map((block, index) => (
                  <PassageBlock
                    key={block.id}
                    block={block}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === blocks.length - 1}
                  />
                ))}

                <div className="py-6">
                  <Button variant="ghost" onClick={clearBlocks}>
                    Remove all passages
                  </Button>
                </div>
              </>
            )}
          </main>

          <AudioBar />

          {tab === 'bible' && <SizeSlider />}
        </div>
      </div>

      <PreviewPanel />
    </div>
  );
};

const Studio = () => (
  <StudioProvider>
    <AudioProvider>
      <StudioWorkspace />
    </AudioProvider>
  </StudioProvider>
);

export default Studio;
