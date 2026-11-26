import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveDialogue,
  AutoDestination,
  DialogueChoice,
  EmergencyIncident,
  GameProgressState,
  GameScreenState,
  GameSettings,
  HudSnapshot,
  LevelCompletionNotice,
  LevelDefinition,
  NearbyInteractable,
  PlayableRole,
  SheruOutfit,
  VehicleDef,
} from './types/game';
import { X } from 'lucide-react';
import {
  AD_BOARDS,
  AdBoardDef,
  BUILDINGS,
  EMPTY_PLOTS,
  NPCS,
  PLAYER_SPAWN,
  WORLD_COLLECTIBLES,
} from './data/worldData';
import { getLevelById } from './data/levelsData';
import {
  applyDialogueChoice,
  buildEventDialogue,
  buildNpcDialogue,
  buildPlotDialogue,
  buildShopDialogue,
  buyVehicle,
  createInitialProgress,
  getRoadEgoMessage,
  loadProgressFromStorage,
  loadSettingsFromStorage,
  normalizeLoadedProgress,
  performBankTransaction,
  pickRandomEvent,
  recordBuildingVisited,
  recordCollectiblePickup,
  recordVehicleDriven,
  recordVehicleParked,
  renameOwnedBusiness,
  resolveHospitalTreatment,
  saveProgressToStorage,
  saveSettingsToStorage,
  setPlayableRole,
  setPlayerOutfit,
  updateDailyActiveStreak,
  upgradeOwnedBusiness,
} from './game/gameLogic';
import {
  buildWeatherHudState,
  createInitialWeatherState,
  getWeatherVisualConfig,
} from './game/weatherLogic';
import { detectCurrentRoadName } from './game/roadNetwork';
import { PurseChaseAction } from './game/chaseLogic';
import {
  loadProgressFromIndexedDb,
  saveCharacterProfileToIndexedDb,
  saveProgressToIndexedDb,
} from './game/indexedDb';
import { ThreeWorld } from './game/ThreeWorld';
import { soundEngine } from './game/audio';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { DialogueModal } from './components/DialogueModal';
import { BankModal } from './components/BankModal';
import { EmpireModal } from './components/EmpireModal';
import { InventoryModal } from './components/InventoryModal';
import { LevelsModal } from './components/LevelsModal';
import { PauseSettingsModal } from './components/PauseSettingsModal';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { HomeWardrobeModal } from './components/HomeWardrobeModal';
import { GarageModal } from './components/GarageModal';
import { EmergencyModal } from './components/EmergencyModal';
import { AdSlot } from './components/AdSlot';
import { PhotoModeOverlay } from './components/PhotoModeOverlay';
import {
  PhotoModeState,
  canTogglePhotoMode,
  createInitialPhotoModeState,
  exitPhotoModeState,
  formatSnapshotFilename,
  recordSnapshotTaken,
  togglePhotoModeControls,
  togglePhotoModeState,
} from './game/photoMode';

type OverlayPanel =
  | 'none'
  | 'bank'
  | 'empire'
  | 'inventory'
  | 'levels'
  | 'wardrobe'
  | 'garage'
  | 'settings'
  | 'about';

export default function App() {
  const savedOnBoot = useRef<GameProgressState | null>(loadProgressFromStorage());
  const [hasSave, setHasSave] = useState<boolean>(Boolean(savedOnBoot.current));
  const [settings, setSettings] = useState<GameSettings>(() => loadSettingsFromStorage());
  const [progress, setProgress] = useState<GameProgressState>(() => {
    const initial = savedOnBoot.current ?? createInitialProgress();
    return updateDailyActiveStreak(initial).state;
  });

  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [screen, setScreen] = useState<GameScreenState>(autostart ? 'playing' : 'title');
  const [activePanel, setActivePanel] = useState<OverlayPanel>('none');
  const [activeDialogue, setActiveDialogue] = useState<ActiveDialogue | null>(null);
  const [levelCompleteNotice, setLevelCompleteNotice] = useState<LevelCompletionNotice | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [roadEgoBanner, setRoadEgoBanner] = useState<{ ml: string; en: string } | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [savedToIndexedDb, setSavedToIndexedDb] = useState<boolean>(false);

  const [emergencyIncident, setEmergencyIncident] = useState<EmergencyIncident | null>(null);
  const [doctorResult, setDoctorResult] = useState<{ ml: string; en: string } | null>(null);
  const [activeAdBoard, setActiveAdBoard] = useState<AdBoardDef | null>(null);
  const [photoMode, setPhotoMode] = useState<PhotoModeState>(() => createInitialPhotoModeState());
  const [photoShutterFlash, setPhotoShutterFlash] = useState<boolean>(false);
  const [lastSnapshotUrl, setLastSnapshotUrl] = useState<string | null>(null);

  const [hud, setHud] = useState<HudSnapshot>({
    playerX: PLAYER_SPAWN.x,
    playerZ: PLAYER_SPAWN.z,
    playerYaw: PLAYER_SPAWN.yaw,
    speed: 0,
    speedKmh: 0,
    district: 'Main Junction',
    roadName: detectCurrentRoadName(PLAYER_SPAWN.x, PLAYER_SPAWN.z),
    inVehicleId: null,
    inVehicleName: null,
    nearby: null,
    timePhase: 'day',
    timeOfDay: 0.28,
    weather: buildWeatherHudState(createInitialWeatherState('sunny'), 'day'),
    npcs: [],
    vehicles: [],
  });

  // Stable refs so ThreeWorld never remounts on React state updates
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<ThreeWorld | null>(null);
  const progressRef = useRef<GameProgressState>(progress);
  const screenRef = useRef<GameScreenState>(screen);
  const modalOpenRef = useRef<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);
  const egoTimerRef = useRef<number | null>(null);
  const incidentRef = useRef<EmergencyIncident | null>(null);
  const hudRef = useRef<HudSnapshot>(hud);
  const photoModeRef = useRef<PhotoModeState>(photoMode);
  const shutterTimerRef = useRef<number | null>(null);

  progressRef.current = progress;
  screenRef.current = screen;
  incidentRef.current = emergencyIncident;
  hudRef.current = hud;
  photoModeRef.current = photoMode;

  // Keep modalOpen false during 'ambulance_en_route' and 'transporting' so live traffic yields and ambulance visibly rushes in!
  const emergencyModalBlocking =
    emergencyIncident !== null &&
    emergencyIncident.status !== 'transporting' &&
    emergencyIncident.status !== 'ambulance_en_route';

  const anyModalOpen =
    activePanel !== 'none' ||
    activeDialogue !== null ||
    activeAdBoard !== null ||
    levelCompleteNotice !== null ||
    emergencyModalBlocking;
  modalOpenRef.current = anyModalOpen;

  const activeLevel = getLevelById(progress.currentLevelId);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 3400);
  }, []);

  const showRoadEgo = useCallback((kind: 'auto' | 'bus') => {
    const msg = getRoadEgoMessage(kind, progressRef.current.playableRole);
    setRoadEgoBanner(msg);
    if (egoTimerRef.current) window.clearTimeout(egoTimerRef.current);
    egoTimerRef.current = window.setTimeout(() => setRoadEgoBanner(null), 3800);
  }, []);

  const commitProgress = useCallback(
    (next: GameProgressState, completed?: LevelCompletionNotice | null) => {
      progressRef.current = next;
      setProgress(next);
      saveProgressToStorage(next);
      void saveProgressToIndexedDb(next).then((ok) => {
        if (ok) setSavedToIndexedDb(true);
      });
      setHasSave(true);
      worldRef.current?.syncProgress(next, false);
      const nextLvl = getLevelById(next.currentLevelId);
      worldRef.current?.setQuestTarget(nextLvl.targetCoords ?? null);

      if (completed) {
        soundEngine.playFanfare();
        worldRef.current?.triggerCelebration('celebrate');
        setLevelCompleteNotice(completed);
      }
    },
    [],
  );

  // Hydrate saved progress & White/Black Suit + Playable Role from IndexedDB on boot
  useEffect(() => {
    let active = true;
    void loadProgressFromIndexedDb().then(({ progress: idbProg, profile }) => {
      if (!active) return;
      if (!idbProg && !profile) return;

      const base: GameProgressState =
        (idbProg ? normalizeLoadedProgress(idbProg) : null) ?? progressRef.current;

      const mergedBase: GameProgressState = profile
        ? {
            ...base,
            sheruOutfit: profile.outfit ?? base.sheruOutfit,
            playableRole: profile.playableRole ?? base.playableRole,
          }
        : base;

      const streakRes = updateDailyActiveStreak(mergedBase);
      const merged = streakRes.state;

      progressRef.current = merged;
      setProgress(merged);
      setHasSave(true);
      setSavedToIndexedDb(true);
      saveProgressToStorage(merged);
      worldRef.current?.syncProgress(merged, false);
      if (streakRes.status === 'incremented') {
        showToast(
          `Daily Active Streak: Day ${merged.dailyStreak}! +${streakRes.bonusFame} Town Fame!`,
        );
      }
    });
    return () => {
      active = false;
    };
  }, [showToast]);

  // Keep body data-state in sync for accessibility & automated verification
  useEffect(() => {
    document.body.dataset.state = screen;
    worldRef.current?.setMode(screen);
    if (screen !== 'playing' && photoModeRef.current.active) {
      setPhotoMode((prev) => exitPhotoModeState(prev));
      worldRef.current?.setPhotoMode(false);
    }
  }, [screen]);

  useEffect(() => {
    document.body.dataset.photoMode = photoMode.active ? 'true' : 'false';
    worldRef.current?.setPhotoMode(photoMode.active);
  }, [photoMode.active]);

  useEffect(() => {
    worldRef.current?.setModalOpen(anyModalOpen);
    if (anyModalOpen && photoModeRef.current.active) {
      setPhotoMode((prev) => exitPhotoModeState(prev));
      worldRef.current?.setPhotoMode(false);
    }
  }, [anyModalOpen]);

  useEffect(() => {
    soundEngine.updateSettings(settings);
    saveSettingsToStorage(settings);
    worldRef.current?.updateSettings(settings);
  }, [settings]);

  // Mount ThreeWorld ONCE inside isolated container ref
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const world = new ThreeWorld(container, progressRef.current, settings, {
      onHudUpdate: (snap) => setHud(snap),
      onInteract: (target: NearbyInteractable) => {
        const cur = progressRef.current;
        if (target.kind === 'npc') {
          const npc = NPCS.find((n) => n.id === target.id);
          if (!npc) return;
          setActiveDialogue(buildNpcDialogue(npc, cur));
        } else if (target.kind === 'building') {
          const b = BUILDINGS.find((x) => x.id === target.id);
          if (!b) return;
          if (b.category === 'bank') {
            const visitRes = recordBuildingVisited(cur, b.id);
            commitProgress(visitRes.state, visitRes.completedLevel);
            setActivePanel('bank');
            soundEngine.playCash();
            return;
          }
          if (b.category === 'home') {
            const visitRes = recordBuildingVisited(cur, b.id);
            commitProgress(visitRes.state, visitRes.completedLevel);
            setActivePanel('wardrobe');
            soundEngine.playInteract();
            return;
          }
          if (b.category === 'hospital') {
            const visitRes = recordBuildingVisited(cur, b.id);
            const treated = resolveHospitalTreatment(visitRes.state, 'manual_call');
            commitProgress(treated.state, visitRes.completedLevel);
            setDoctorResult({ ml: treated.mlDoctorLine, en: treated.enDoctorLine });
            setEmergencyIncident({
              id: `hosp_visit_${Date.now()}`,
              cause: 'manual_call',
              title: 'Kerala General Hospital — VIP Checkup',
              mlMessage: treated.mlDoctorLine,
              enMessage: treated.enDoctorLine,
              sceneX: b.x,
              sceneZ: b.z,
              status: 'treated',
            });
            soundEngine.playFanfare();
            return;
          }
          if (b.category === 'secret') {
            const visitRes = recordBuildingVisited(cur, b.id);
            commitProgress(visitRes.state, visitRes.completedLevel);
            const npc = NPCS.find((n) => n.id === 'npc_mysterious');
            if (npc) setActiveDialogue(buildNpcDialogue(npc, visitRes.state));
            return;
          }
          const owner = NPCS.find((n) => n.id === b.ownerNpcId);
          setActiveDialogue(
            buildShopDialogue(b, owner, cur, owner ? cur.npcMemory[owner.id] : undefined),
          );
        } else if (target.kind === 'plot') {
          const p = EMPTY_PLOTS.find((x) => x.id === target.id);
          if (!p) return;
          setActiveDialogue(buildPlotDialogue(p, cur));
        } else if (target.kind === 'ad_board') {
          const board = AD_BOARDS.find((x) => x.id === target.id);
          if (!board) return;
          setActiveAdBoard(board);
          soundEngine.playInteract();
        }
      },
      onCollectiblePickup: (collectibleId: string) => {
        const col = WORLD_COLLECTIBLES.find((c) => c.id === collectibleId);
        if (!col) return;
        const res = recordCollectiblePickup(
          progressRef.current,
          col.id,
          col.name,
          col.mlName,
          col.description,
        );
        commitProgress(res.state, res.completedLevel);
        showToast(`Collected: ${col.name} (${col.mlName})!`);
      },
      onVehicleEnter: (vehicleId: string) => {
        const res = recordVehicleDriven(progressRef.current, vehicleId);
        commitProgress(res.state, res.completedLevel);
        showToast('Driving! WASD Steer · Space Handbrake · H Horn · X Siren · E Exit');
      },
      onBuildingApproach: (buildingId: string) => {
        const res = recordBuildingVisited(progressRef.current, buildingId);
        if (res.completedLevel || res.state !== progressRef.current) {
          commitProgress(res.state, res.completedLevel);
        }
      },
      onAutoRandomEvent: (district: string) => {
        if (screenRef.current !== 'playing' || modalOpenRef.current) return;
        const evt = pickRandomEvent(progressRef.current, district);
        soundEngine.playEventPop();
        setActiveDialogue(buildEventDialogue(evt, progressRef.current.turnCounter));
      },
      onPositionSample: (pos) => {
        progressRef.current = { ...progressRef.current, lastPlayerPos: pos };
      },
      onRoadEgo: (kind) => {
        showRoadEgo(kind);
      },
      onEmergencyIncident: (cause, x, z, roadName) => {
        if (
          cause !== 'airplane_crash' &&
          incidentRef.current &&
          incidentRef.current.status !== 'treated'
        ) {
          return;
        }
        const crashSite = roadName ?? 'Off-Airport Zone';
        const isMountainCrash = crashSite.toLowerCase().includes('mountain');
        const meta =
          cause === 'airplane_crash'
            ? isMountainCrash
              ? {
                  title: `BHOOOOM! PLANE HIT WESTERN GHATS MOUNTAIN!`,
                  mlMessage:
                    'ഭൂം!! വിമാനം നേരെ മലയിൽ ഇടിച്ച് പൊട്ടിത്തെറിച്ചു! 108 ആംബുലൻസും ഫയർ ഫോഴ്‌സും സൈറൺ ഓണാക്കി പാഞ്ഞെത്തുന്നു!',
                  enMessage:
                    'BHOOOOM! Your aeroplane flew straight into the Western Ghats mountain ridge and blasted! 108 Ambulance & Kerala Fire Rescue are racing in!',
                }
              : {
                  title: `BHOOOOM! OFF-AIRPORT PLANE BLAST AT ${crashSite.toUpperCase()}!`,
                  mlMessage:
                    'ഭൂം!! എയർപോർട്ടിന് പുറത്ത് വിമാനം ഇറക്കിയതോ ഓടിച്ചതോ കാരണം പൊട്ടിത്തെറിച്ചു! 108 ആംബുലൻസും ഫയർ ഫോഴ്‌സും പാഞ്ഞെത്തുന്നു!',
                  enMessage: `BHOOOOM! Going or landing outside Kerala Airport Runway 09/27 (${crashSite}) caused a real plane blast! 108 Ambulance & Kerala Fire Rescue are rushing in!`,
                }
            : cause === 'coconut_drop'
              ? {
                  title: 'COCONUT BONK UNDER PALM TREE!',
                  mlMessage:
                    'അയ്യോ! തെങ്ങിൻ തോട്ടത്തിൽ നിന്ന് ഒരു വലിയ തേങ്ങ ഷേരു ഭായിയുടെ തലയിൽ വീണു! നാട്ടുകാർ 108 ആംബുലൻസ് വിളിക്കുന്നു!',
                  enMessage:
                    'BONK! A giant Kerala coconut dropped right onto Sheru Bhai! Cartoon safe — bystanders urge you to call 108 Ambulance!',
                }
              : cause === 'pedestrian_bump'
                ? {
                    title: 'SAFE ROAD BUMP — WITNESSES CALL 108!',
                    mlMessage:
                      'ആർക്കും പരിക്കില്ല! പക്ഷേ നാട്ടുകാർ സുരക്ഷയ്ക്കായി 108 ആംബുലൻസ് വിളിക്കണം എന്ന് പറയുന്നു!',
                    enMessage:
                      'Safe cartoon bump — nobody is injured! Nearby people immediately suggest calling 108 Ambulance to check everyone at the Hospital!',
                  }
                : {
                    title: 'ZEBRA CROSSING SCARE — CALL 108!',
                    mlMessage:
                      'അയ്യോ! സീബ്രാ ക്രോസിംഗിൽ വണ്ടി തട്ടി! ഷേരു ഭായിക്ക് ഒന്നും പറ്റിയില്ലെങ്കിലും 108 ആംബുലൻസ് വിളിക്കാം!',
                    enMessage:
                      'Whoa! A close call at the Kerala zebra crossing! Cartoon safe — tap below to summon the 108 Ambulance to Kerala General Hospital!',
                  };

        setDoctorResult(null);
        setActiveDialogue(null);
        setActivePanel('none');
        setEmergencyIncident({
          id: `emg_${Date.now()}`,
          cause,
          title: meta.title,
          mlMessage: meta.mlMessage,
          enMessage: meta.enMessage,
          sceneX: x,
          sceneZ: z,
          crashRoadName: cause === 'airplane_crash' ? crashSite : undefined,
          status: cause === 'airplane_crash' ? 'ambulance_en_route' : 'alert',
        });
        if (cause === 'airplane_crash') {
          showToast(
            `MAYDAY! Plane blast on ${crashSite}! 108 Ambulance & Fire Rescue racing in!`,
          );
        }
      },
      onSafeLanding: (aircraftName) => {
        showToast(`Smooth Touchdown! ${aircraftName} landed safely on Runway 09/27!`);
      },
      onAmbulanceArrived: () => {
        setEmergencyIncident((prev) =>
          prev
            ? { ...prev, status: 'ambulance_arrived' }
            : {
                id: `emg_arr_${Date.now()}`,
                cause: 'manual_call',
                title: '108 Ambulance Arrived!',
                mlMessage: '108 ആംബുലൻസ് എത്തി!',
                enMessage: '108 Ambulance has arrived at your location!',
                sceneX: progressRef.current.lastPlayerPos.x,
                sceneZ: progressRef.current.lastPlayerPos.z,
                status: 'ambulance_arrived',
              },
        );
      },
      onHospitalArrived: () => {
        const curCause = incidentRef.current?.cause ?? 'manual_call';
        const treated = resolveHospitalTreatment(progressRef.current, curCause);
        commitProgress(treated.state);
        setDoctorResult({ ml: treated.mlDoctorLine, en: treated.enDoctorLine });
        setEmergencyIncident((prev) => ({
          id: prev?.id ?? `hosp_${Date.now()}`,
          cause: curCause,
          title: 'Arrived at Kerala General Hospital!',
          mlMessage: treated.mlDoctorLine,
          enMessage: treated.enDoctorLine,
          sceneX: 54,
          sceneZ: -36,
          status: 'treated',
        }));
        soundEngine.playFanfare();
      },
      onVehicleParked: (vehicleId, x, z, yaw, bayName) => {
        const next = recordVehicleParked(progressRef.current, vehicleId, x, z, yaw, bayName);
        commitProgress(next);
        showToast(
          bayName
            ? `Vehicle neatly parked in ${bayName}!`
            : 'Vehicle parked safely & saved to Garage!',
        );
      },
    });

    worldRef.current = world;
    world.setMode(autostart ? 'playing' : 'title');
    world.setQuestTarget(getLevelById(progressRef.current.currentLevelId).targetCoords ?? null);

    return () => {
      world.dispose();
      worldRef.current = null;
      soundEngine.stopSiren();
      soundEngine.stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start / Continue handlers
  const startNewGame = useCallback(() => {
    const fresh = createInitialProgress();
    soundEngine.unlockAndStartMusic();
    soundEngine.playFanfare();
    setActiveDialogue(null);
    setActiveAdBoard(null);
    setActivePanel('none');
    setLevelCompleteNotice(null);
    setEmergencyIncident(null);
    progressRef.current = fresh;
    setProgress(fresh);
    saveProgressToStorage(fresh);
    void saveProgressToIndexedDb(fresh);
    setHasSave(true);
    worldRef.current?.syncProgress(fresh, true);
    worldRef.current?.setQuestTarget(getLevelById(1).targetCoords ?? null);
    setScreen('playing');
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    showToast('Welcome to Kerala Meme Town! Talk to Shaji Pappan Jr. or open Garage [G]!');
  }, [showToast]);

  const continueGame = useCallback(() => {
    const loadedBase = loadProgressFromStorage() ?? progressRef.current;
    const streakRes = updateDailyActiveStreak(loadedBase);
    const loaded = streakRes.state;
    soundEngine.unlockAndStartMusic();
    soundEngine.playInteract();
    setActiveDialogue(null);
    setActiveAdBoard(null);
    setActivePanel('none');
    setLevelCompleteNotice(null);
    setEmergencyIncident(null);
    progressRef.current = loaded;
    setProgress(loaded);
    saveProgressToStorage(loaded);
    void saveProgressToIndexedDb(loaded);
    worldRef.current?.syncProgress(loaded, true);
    worldRef.current?.setQuestTarget(getLevelById(loaded.currentLevelId).targetCoords ?? null);
    setScreen('playing');
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (streakRes.status === 'incremented') {
      showToast(
        `Daily Active Streak: Day ${loaded.dailyStreak}! +${streakRes.bonusFame} Town Fame!`,
      );
    } else {
      showToast(`Welcome back Sheru Bhai! Level ${loaded.currentLevelId} · Day ${loaded.dailyStreak} Streak`);
    }
  }, [showToast]);

  const triggerManualRandomEvent = useCallback(() => {
    if (screenRef.current !== 'playing') return;
    const evt = pickRandomEvent(progressRef.current, hud.district);
    soundEngine.playEventPop();
    setActivePanel('none');
    setActiveDialogue(buildEventDialogue(evt, progressRef.current.turnCounter));
  }, [hud.district]);

  const handleManualCall108 = useCallback(() => {
    if (screenRef.current !== 'playing') return;
    setActivePanel('none');
    setActiveDialogue(null);
    setDoctorResult(null);
    setEmergencyIncident({
      id: `manual_108_${Date.now()}`,
      cause: 'manual_call',
      title: '108 KERALA AMBULANCE HOTLINE',
      mlMessage:
        'ഹലോ 108 എമർജൻസി! ആംബുലൻസ് ഇപ്പോൾ തന്നെ സൈറൺ ഓണാക്കി വരുന്നുണ്ട്. മറ്റു വണ്ടികൾ സൈഡ് തരും!',
      enMessage:
        '108 Kerala Emergency Dispatch standing by! Summon the white 3D Ambulance with flashing lights & siren right to your location.',
      sceneX: hud.playerX,
      sceneZ: hud.playerZ,
      status: 'alert',
    });
    soundEngine.playEventPop();
  }, [hud.playerX, hud.playerZ]);

  const handleStartPurseChase = useCallback(() => {
    if (screenRef.current !== 'playing') return;
    setActivePanel('none');
    setActiveDialogue(null);
    const started = worldRef.current?.startPurseChaseEvent();
    if (started) {
      showToast(
        `അയ്യോ! Pickpocket snatched ${started.victimName}'s purse! Chase & press Gun [1], Slap Hand [2], or Hand to Police [3]!`,
      );
    }
  }, [showToast]);

  const handlePurseChaseAction = useCallback(
    (action: PurseChaseAction) => {
      if (screenRef.current !== 'playing') return;
      const res = worldRef.current?.performPurseChaseAction(action);
      if (!res) return;
      if (res.rewardFame > 0 || res.rewardGhop > 0) {
        const cur = progressRef.current;
        const nextReputation = cur.reputation + res.rewardFame;
        const nextProg: GameProgressState = {
          ...cur,
          reputation: nextReputation,
          ghopEarnedTotal: cur.ghopEarnedTotal + res.rewardGhop,
          eventsResolvedCount: cur.eventsResolvedCount + (res.completed ? 1 : 0),
        };
        commitProgress(nextProg);
      }
      showToast(res.messageEn);
    },
    [commitProgress, showToast],
  );

  const handleTogglePhotoMode = useCallback(() => {
    if (!canTogglePhotoMode(screenRef.current, modalOpenRef.current)) return;
    setPhotoMode((prev) => {
      const next = togglePhotoModeState(prev);
      worldRef.current?.setPhotoMode(next.active);
      return next;
    });
    soundEngine.playInteract();
  }, []);

  const handleExitPhotoMode = useCallback(() => {
    setPhotoMode((prev) => {
      const next = exitPhotoModeState(prev);
      worldRef.current?.setPhotoMode(false);
      return next;
    });
    soundEngine.playInteract();
  }, []);

  const handleCaptureSnapshot = useCallback(() => {
    const dataUrl = worldRef.current?.capturePhotoSnapshot();
    if (!dataUrl) return;
    const filename = formatSnapshotFilename(hudRef.current.district);
    soundEngine.playCameraShutter();
    setPhotoShutterFlash(true);
    if (shutterTimerRef.current) window.clearTimeout(shutterTimerRef.current);
    shutterTimerRef.current = window.setTimeout(() => setPhotoShutterFlash(false), 180);
    setLastSnapshotUrl(dataUrl);
    setPhotoMode((prev) => recordSnapshotTaken(prev, filename));

    // Trigger direct PNG download for the player
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, []);

  // Global keyboard shortcuts (Start on Title, Pause Esc/P, Photo Mode V, Hotkeys M/L/B/K/I/R/T/Y/G/U)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (screenRef.current === 'title' && activePanel === 'none') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          if (hasSave) continueGame();
          else startNewGame();
        }
        return;
      }

      // Photo Mode dedicated shortcuts: V or Escape exits, Space/Enter snaps PNG, H toggles minimal bar
      if (screenRef.current === 'playing' && photoModeRef.current.active) {
        if (e.repeat) return;
        if (e.code === 'KeyV' || e.code === 'Escape') {
          e.preventDefault();
          handleExitPhotoMode();
        } else if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleCaptureSnapshot();
        } else if (e.code === 'KeyH') {
          e.preventDefault();
          setPhotoMode((prev) => togglePhotoModeControls(prev));
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (emergencyIncident && emergencyIncident.status !== 'transporting') {
          worldRef.current?.cancelEmergencyDispatch();
          setEmergencyIncident(null);
        } else if (activeAdBoard) {
          setActiveAdBoard(null);
        } else if (activeDialogue) {
          setActiveDialogue(null);
        } else if (levelCompleteNotice) {
          setLevelCompleteNotice(null);
        } else if (activePanel !== 'none') {
          setActivePanel('none');
        } else if (screenRef.current === 'playing') {
          setSavedNotice(null);
          setScreen('paused');
        } else if (screenRef.current === 'paused') {
          setScreen('playing');
        }
        return;
      }

      if (screenRef.current !== 'playing') return;

      if (e.code === 'KeyV' && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (canTogglePhotoMode(screenRef.current, modalOpenRef.current)) {
          e.preventDefault();
          handleTogglePhotoMode();
        }
        return;
      }

      if (e.code === 'KeyM') {
        setSettings((s) => ({ ...s, muted: !s.muted }));
      } else if (e.code === 'KeyG' && !activeDialogue) {
        setActivePanel((p) => (p === 'garage' ? 'none' : 'garage'));
      } else if (e.code === 'KeyU' && !activeDialogue) {
        setActivePanel((p) => (p === 'wardrobe' ? 'none' : 'wardrobe'));
      } else if (e.code === 'KeyL' && !activeDialogue) {
        setActivePanel((p) => (p === 'levels' ? 'none' : 'levels'));
      } else if (e.code === 'KeyB' && !activeDialogue) {
        setActivePanel((p) => (p === 'empire' ? 'none' : 'empire'));
      } else if (e.code === 'KeyK' && !activeDialogue) {
        setActivePanel((p) => (p === 'bank' ? 'none' : 'bank'));
      } else if (e.code === 'KeyI' && !activeDialogue) {
        setActivePanel((p) => (p === 'inventory' ? 'none' : 'inventory'));
      } else if (e.code === 'KeyR' && !activeDialogue && activePanel === 'none') {
        triggerManualRandomEvent();
      } else if (e.code === 'KeyT' && !activeDialogue && activePanel === 'none') {
        const nextTime = worldRef.current?.cycleTimeOfDay() ?? 0.28;
        progressRef.current = { ...progressRef.current, timeOfDay: nextTime };
      } else if (e.code === 'KeyY' && !activeDialogue && activePanel === 'none') {
        const nextCond = worldRef.current?.cycleWeather();
        if (nextCond) {
          const cfg = getWeatherVisualConfig(nextCond, hudRef.current.timePhase);
          showToast(`Weather: ${cfg.label} (${cfg.mlLabel})`);
        }
      } else if (e.code === 'KeyC' && !activeDialogue && activePanel === 'none') {
        if (hudRef.current.railway?.riderMode && hudRef.current.railway.riderMode !== 'none') {
          return; // KeyC toggles train cab/window view inside ThreeWorld
        }
        handleStartPurseChase();
      } else if (e.code === 'Digit1' && !activeDialogue && activePanel === 'none') {
        if (!hudRef.current.activeChase?.active && hudRef.current.railway?.stoppedTrainId) {
          const res = worldRef.current?.boardTrainAtStation('driver');
          if (res?.message) showToast(res.message);
        } else {
          handlePurseChaseAction('gun');
        }
      } else if (e.code === 'Digit2' && !activeDialogue && activePanel === 'none') {
        if (!hudRef.current.activeChase?.active && hudRef.current.railway?.stoppedTrainId) {
          const res = worldRef.current?.boardTrainAtStation('passenger');
          if (res?.message) showToast(res.message);
        } else {
          handlePurseChaseAction('slap');
        }
      } else if (e.code === 'Digit3' && !activeDialogue && activePanel === 'none') {
        handlePurseChaseAction('police');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeAdBoard,
    activeDialogue,
    activePanel,
    continueGame,
    emergencyIncident,
    handleCaptureSnapshot,
    handleExitPhotoMode,
    handlePurseChaseAction,
    handleStartPurseChase,
    handleTogglePhotoMode,
    hasSave,
    levelCompleteNotice,
    showToast,
    startNewGame,
    triggerManualRandomEvent,
  ]);

  const handleSelectDialogueChoice = (choice: DialogueChoice) => {
    if (!activeDialogue) return;
    const res = applyDialogueChoice(progressRef.current, activeDialogue, choice);

    if (res.boughtBuildingId) {
      soundEngine.playCash();
      worldRef.current?.triggerCelebration('celebrate');
      showToast(`★ NEW EMPIRE PROPERTY: ${res.state.ownedBusinesses[res.boughtBuildingId]?.customName}!`);
    } else if (res.builtPlotId) {
      soundEngine.playBuild();
      worldRef.current?.triggerCelebration('laugh');
      showToast(`★ BUILT IN 3D: ${res.state.builtShops[res.builtPlotId]?.name}!`);
    } else if (choice.effect.sheruReaction === 'celebrate' || choice.effect.sheruReaction === 'flex') {
      soundEngine.playCash();
      worldRef.current?.triggerCelebration('celebrate');
    } else {
      soundEngine.playInteract();
    }

    commitProgress(res.state, res.completedLevel);

    if (res.openBankRequested) {
      setActiveDialogue(null);
      setActivePanel('bank');
      return;
    }

    setActiveDialogue(res.resolvedDialogue);
  };

  const handleBankTransaction = (
    type: 'deposit' | 'withdraw' | 'investment',
    label: string,
    amount: number,
    openAccount = false,
  ) => {
    soundEngine.playCash();
    const res = performBankTransaction(progressRef.current, type, label, amount, {
      openAccount,
    });
    commitProgress(res.state, res.completedLevel);
  };

  const handleRenameBusiness = (buildingId: string, newName: string) => {
    const next = renameOwnedBusiness(progressRef.current, buildingId, newName);
    commitProgress(next);
    showToast(`Renamed business to "${newName}"!`);
  };

  const handleUpgradeBusiness = (buildingId: string) => {
    soundEngine.playCash();
    const next = upgradeOwnedBusiness(progressRef.current, buildingId);
    commitProgress(next);
    const biz = next.ownedBusinesses[buildingId];
    if (biz) showToast(`Upgraded ${biz.customName} to Lv.${biz.level}!`);
  };

  const handleFastTravel = (x: number, z: number, label: string, targetId?: string) => {
    worldRef.current?.teleportNear(x, z, targetId);
    soundEngine.playInteract();
    setActivePanel('none');
    showToast(`Sheru arrived at ${label}!`);
  };

  const handleSelectLevel = (lvl: LevelDefinition, fastTravel: boolean) => {
    const next: GameProgressState = { ...progressRef.current, currentLevelId: lvl.id };
    commitProgress(next);
    setActivePanel('none');
    if (fastTravel && lvl.targetCoords) {
      worldRef.current?.teleportNear(
        lvl.targetCoords.x,
        lvl.targetCoords.z,
        lvl.targetId,
      );
    }
    showToast(`Tracking Level ${lvl.id}: ${lvl.title}`);
  };

  const handleSelectOutfit = (outfit: SheruOutfit) => {
    const next = setPlayerOutfit(progressRef.current, outfit);
    commitProgress(next);
    void saveCharacterProfileToIndexedDb(outfit, 'sheru').then((ok) => {
      if (ok) setSavedToIndexedDb(true);
    });
    soundEngine.playCash();
    worldRef.current?.triggerCelebration('flex');
    showToast(
      `Sheru Bhai switched to ${outfit.toUpperCase()} SUIT (Auto-saved to IndexedDB)!`,
    );
  };

  const handleSelectRole = (role: PlayableRole) => {
    const next = setPlayableRole(progressRef.current, role);
    commitProgress(next);
    void saveCharacterProfileToIndexedDb(next.sheruOutfit, role).then((ok) => {
      if (ok) setSavedToIndexedDb(true);
    });
    soundEngine.playInteract();
    worldRef.current?.triggerCelebration('celebrate');
    showToast(
      `Character Switched to ${role.replace('_', ' ').toUpperCase()} (Auto-saved to IndexedDB)!`,
    );
  };

  const handleBuyVehicle = (veh: VehicleDef) => {
    const res = buyVehicle(progressRef.current, veh);
    commitProgress(res.state);
    soundEngine.playCash();
    showToast(`Bought ${veh.name} for your Garage!`);
  };

  const handleSpawnAndDrive = (veh: VehicleDef) => {
    setActivePanel('none');
    worldRef.current?.spawnAndEnterVehicle(veh);
    if (veh.isAircraft) {
      showToast(
        `Cleared for Takeoff in ${veh.name} on Runway 09! Hold W + Press Space to fly!`,
      );
    } else {
      showToast(
        `Easy Driving ${veh.name}! Top Speed ${veh.maxKmh ?? Math.round(veh.maxSpeed * 4)} KM/H`,
      );
    }
  };

  const handleGoToAirport = () => {
    setActivePanel('none');
    worldRef.current?.teleportToAirport();
    soundEngine.playInteract();
    showToast('Welcome to Kerala International Airport (COK)! Walk to any Aeroplane & press E to fly!');
  };

  const handleGoToScenicSpot = (spotId: string) => {
    setActivePanel('none');
    worldRef.current?.teleportToScenicSpot(spotId);
    soundEngine.playInteract();
    if (spotId === 'beach') {
      showToast('Malabar Golden Beach! Walk to any sea bench & press E to sit and enjoy the Arabian Sea!');
    } else {
      showToast('Arrived on Platform 1! Wait for an express train or cross the Foot-Overbridge to Platform B!');
    }
  };

  const handleBoardTrain = (mode: 'driver' | 'passenger') => {
    const res = worldRef.current?.boardTrainAtStation(mode);
    if (res?.message) showToast(res.message);
  };

  const handleAlightTrain = () => {
    const res = worldRef.current?.alightCurrentTrain();
    if (res?.message) showToast(res.message);
  };

  const handleWaitForTrain = () => {
    const ok = worldRef.current?.waitForNextTrainAtStation();
    if (ok) {
      showToast('Express train approaching the platform — prepare to board!');
    }
  };

  const handleToggleSitBench = () => {
    const sitting = worldRef.current?.toggleSitOnBench();
    showToast(
      sitting
        ? 'Relaxing on Malabar Sea Bench — enjoy the Arabian Sea waves!'
        : 'Stood up from Malabar Sea Bench!',
    );
  };

  const handleTriggerAutoLand = () => {
    const active = worldRef.current?.triggerAutoLand() ?? false;
    showToast(
      active
        ? 'Auto-Land engaged — gliding smoothly onto Kerala Airport Runway 09!'
        : 'Auto-Land cancelled — Manual easy flight control!',
    );
  };

  const handleSelectAutopilot = (dest: AutoDestination | null) => {
    worldRef.current?.setAutopilotDestination(dest);
    if (dest) {
      showToast(`Auto-Destination locked: ${dest.name} (Auto-Horn & Siren Active!)`);
    } else {
      showToast('Auto-Destination disengaged — Manual control!');
    }
  };

  const handleSaveGame = () => {
    const ok = saveProgressToStorage(progressRef.current);
    void saveProgressToIndexedDb(progressRef.current).then((idbOk) => {
      if (idbOk) setSavedToIndexedDb(true);
    });
    setHasSave(true);
    setSavedNotice(ok ? 'Progress saved to Browser Storage & IndexedDB!' : 'Could not save to storage.');
    soundEngine.playCash();
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#121c17]">
      {/* Isolated WebGL Canvas Mount Container — Never Re-rendered by HUD State */}
      <div ref={canvasContainerRef} className="fixed inset-0 w-full h-full" />

      {/* TITLE SCREEN OVERLAY */}
      {screen === 'title' && activePanel === 'none' && (
        <TitleScreen
          hasSave={hasSave}
          savedLevel={progress.currentLevelId}
          savedBusinesses={
            Object.keys(progress.ownedBusinesses).length +
            Object.keys(progress.builtShops).length
          }
          onPlayNew={startNewGame}
          onContinue={continueGame}
          onOpenSettings={() => setActivePanel('settings')}
          onOpenAbout={() => setActivePanel('about')}
        />
      )}

      {/* IN-GAME HUD (Hidden completely while Photo Mode [V] is active!) */}
      {screen === 'playing' && !photoMode.active && (
        <GameHUD
          hud={hud}
          progress={progress}
          activeLevel={activeLevel}
          settings={settings}
          toastMessage={toastMessage}
          roadEgoBanner={roadEgoBanner}
          onOpenLevels={() => setActivePanel('levels')}
          onOpenEmpire={() => setActivePanel('empire')}
          onOpenBank={() => setActivePanel('bank')}
          onOpenInventory={() => setActivePanel('inventory')}
          onOpenGarage={() => setActivePanel('garage')}
          onGoToAirport={handleGoToAirport}
          onGoToScenicSpot={handleGoToScenicSpot}
          onBoardTrain={handleBoardTrain}
          onAlightTrain={handleAlightTrain}
          onWaitForTrain={handleWaitForTrain}
          onCycleTrainView={() => worldRef.current?.cycleTrainCameraView()}
          onTrainHorn={() => worldRef.current?.soundTrainHorn()}
          onTrainThrottle={(v) => worldRef.current?.setTrainTouchThrottle(v)}
          onToggleSitBench={handleToggleSitBench}
          onTriggerAutoLand={handleTriggerAutoLand}
          onOpenWardrobe={() => setActivePanel('wardrobe')}
          onCallEmergency108={handleManualCall108}
          onSelectAutopilot={handleSelectAutopilot}
          onToggleSiren={() => {
            const on = worldRef.current?.toggleActiveSiren() ?? false;
            showToast(on ? 'Emergency Siren ON! Traffic yielding!' : 'Siren turned OFF.');
          }}
          onParkVehicle={() => worldRef.current?.parkActiveVehicle()}
          onTriggerRandomEvent={triggerManualRandomEvent}
          onStartPurseChase={handleStartPurseChase}
          onChaseAction={handlePurseChaseAction}
          onCycleTime={() => {
            const nextTime = worldRef.current?.cycleTimeOfDay() ?? 0.28;
            progressRef.current = { ...progressRef.current, timeOfDay: nextTime };
          }}
          onCycleWeather={() => {
            const nextCond = worldRef.current?.cycleWeather();
            if (nextCond) {
              const cfg = getWeatherVisualConfig(nextCond, hudRef.current.timePhase);
              showToast(`Weather: ${cfg.label} (${cfg.mlLabel})`);
            }
          }}
          onEnterPhotoMode={handleTogglePhotoMode}
          onToggleMute={() => setSettings((s) => ({ ...s, muted: !s.muted }))}
          onPause={() => {
            setSavedNotice(null);
            setScreen('paused');
          }}
          onInteractClick={() => worldRef.current?.triggerInteract()}
          onJumpClick={() => worldRef.current?.triggerJump()}
          onTeleportToObjective={() => {
            if (activeLevel.targetCoords) {
              handleFastTravel(
                activeLevel.targetCoords.x,
                activeLevel.targetCoords.z,
                `Level ${activeLevel.id}: ${activeLevel.title}`,
                activeLevel.targetId,
              );
            }
          }}
          onTouchMove={(x, y, running) => worldRef.current?.setTouchInput(x, y, running)}
          onTouchFlightVertical={(dir) => worldRef.current?.setTouchFlightVertical(dir)}
          onTouchLook={(dx, dy) => worldRef.current?.rotateCameraDelta(dx, dy)}
        />
      )}

      {/* PHOTO MODE [V] — Hides HUD, Freezes Camera & Captures Full-Resolution 3D PNG Snapshots */}
      {screen === 'playing' && photoMode.active && (
        <PhotoModeOverlay
          district={hud.district}
          controlsVisible={photoMode.controlsVisible}
          shutterFlash={photoShutterFlash}
          snapshotCount={photoMode.snapshotCount}
          lastSnapshotUrl={lastSnapshotUrl}
          lastSnapshotName={photoMode.lastSnapshotName}
          onCaptureSnapshot={handleCaptureSnapshot}
          onToggleControls={() => setPhotoMode((prev) => togglePhotoModeControls(prev))}
          onExitPhotoMode={handleExitPhotoMode}
        />
      )}

      {/* HOME WARDROBE (WHITE/BLACK/GOLD) & PLAYABLE CHARACTER ROLE SWITCH */}
      {screen === 'playing' && activePanel === 'wardrobe' && (
        <HomeWardrobeModal
          progress={progress}
          savedToIndexedDb={savedToIndexedDb}
          onSelectOutfit={handleSelectOutfit}
          onSelectRole={handleSelectRole}
          onFastTravelResort={() =>
            handleFastTravel(30, 56, 'Sheru Pool & Luxury Resort', 'pool_resort')
          }
          onFastTravelHospital={() =>
            handleFastTravel(64, -36.5, 'Kerala General Hospital (108)', 'hospital')
          }
          onClose={() => setActivePanel('none')}
        />
      )}

      {/* VEHICLE GARAGE & AIRPORT HANGAR */}
      {screen === 'playing' && activePanel === 'garage' && (
        <GarageModal
          progress={progress}
          onBuyVehicle={handleBuyVehicle}
          onSpawnAndDrive={handleSpawnAndDrive}
          onGoToAirport={handleGoToAirport}
          onClose={() => setActivePanel('none')}
        />
      )}

      {/* 108 EMERGENCY AMBULANCE RESCUE MODAL */}
      {screen === 'playing' &&
        emergencyIncident &&
        emergencyIncident.status !== 'transporting' && (
          <EmergencyModal
            incident={emergencyIncident}
            doctorResult={doctorResult}
            onCallAmbulance={() => {
              const targetX = emergencyIncident.sceneX;
              const targetZ = emergencyIncident.sceneZ;
              setEmergencyIncident((prev) =>
                prev ? { ...prev, status: 'ambulance_en_route' } : null,
              );
              worldRef.current?.dispatchEmergencyAmbulance(targetX, targetZ);
              showToast('108 Ambulance dispatched! Siren ON — traffic giving way!');
            }}
            onChooseRideAuto={() => {
              setEmergencyIncident((prev) =>
                prev
                  ? { ...prev, status: 'transporting', driverChoice: 'auto_ambulance' }
                  : null,
              );
              worldRef.current?.boardAmbulanceToHospital('auto_ambulance');
              showToast('108 Auto-Drive engaged! Racing to Kerala General Hospital up to 180 km/h!');
            }}
            onChooseDriveSelf={() => {
              setEmergencyIncident((prev) =>
                prev
                  ? { ...prev, status: 'transporting', driverChoice: 'player_driver' }
                  : null,
              );
              worldRef.current?.boardAmbulanceToHospital('player_driver');
              showToast('You are driving the 108 Ambulance! Follow the red + on the minimap to Hospital!');
            }}
            onDismiss={() => {
              worldRef.current?.cancelEmergencyDispatch();
              setEmergencyIncident(null);
              setDoctorResult(null);
            }}
          />
        )}

      {/* DIALOGUE & CHOICE MODAL */}
      {screen === 'playing' && activeDialogue && (
        <DialogueModal
          dialogue={activeDialogue}
          npcMemory={activeDialogue.npcId ? progress.npcMemory[activeDialogue.npcId] : undefined}
          onSelectChoice={handleSelectDialogueChoice}
          onClose={() => setActiveDialogue(null)}
        />
      )}

      {/* LIVE 300×250 TOWN ADS BOARD MODAL */}
      {screen === 'playing' && activeAdBoard && (
        <div
          className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeAdBoard.name}
        >
          <div className="w-full max-w-md rounded-2xl bg-[#111d17] border-2 border-[#f5c542] shadow-[0_18px_50px_rgba(0,0,0,0.75)] overflow-hidden text-[#fff8e7]">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#172820] border-b border-[#d4a12a]/40">
              <div>
                <h2 className="font-display font-extrabold text-base text-[#ffd166] leading-tight">
                  {activeAdBoard.name}
                </h2>
                <p className="text-xs font-ml text-[#9ae6b4]">{activeAdBoard.mlName}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAdBoard(null)}
                aria-label="Close Ads Board"
                className="p-1.5 rounded-lg bg-[#21382d] hover:bg-[#2d4d3e] text-[#ffd166] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex flex-col items-center gap-4">
              <AdSlot variant="board_300x250" testId="town-board-300x250" />
              <button
                type="button"
                onClick={() => setActiveAdBoard(null)}
                className="w-full py-2.5 rounded-xl bg-[#f5c542] hover:bg-[#ffd566] text-[#141a17] font-display font-extrabold text-sm cursor-pointer"
              >
                BACK TO KERALA TOWN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GHOP GHOP INTERNATIONAL BANK DASHBOARD */}
      {screen === 'playing' && activePanel === 'bank' && (
        <BankModal
          progress={progress}
          onTransaction={handleBankTransaction}
          onClose={() => setActivePanel('none')}
        />
      )}

      {/* BUSINESS EMPIRE MANAGER */}
      {screen === 'playing' && activePanel === 'empire' && (
        <EmpireModal
          progress={progress}
          onRenameBusiness={handleRenameBusiness}
          onUpgradeBusiness={handleUpgradeBusiness}
          onFastTravel={handleFastTravel}
          onClose={() => setActivePanel('none')}
        />
      )}

      {/* INVENTORY BRIEFCASE */}
      {screen === 'playing' && activePanel === 'inventory' && (
        <InventoryModal progress={progress} onClose={() => setActivePanel('none')} />
      )}

      {/* 100-LEVEL CAMPAIGN SELECTOR */}
      {screen === 'playing' && activePanel === 'levels' && (
        <LevelsModal
          progress={progress}
          onSelectLevel={handleSelectLevel}
          onClose={() => setActivePanel('none')}
        />
      )}

      {/* LEVEL COMPLETION CELEBRATION */}
      {screen === 'playing' && levelCompleteNotice && (
        <LevelCompleteModal
          notice={levelCompleteNotice}
          onNextLevel={() => {
            const nextId = levelCompleteNotice.nextLevelId;
            setLevelCompleteNotice(null);
            if (nextId) {
              const nextLvl = getLevelById(nextId);
              if (nextLvl.targetCoords) {
                worldRef.current?.teleportNear(
                  nextLvl.targetCoords.x,
                  nextLvl.targetCoords.z,
                  nextLvl.targetId,
                );
              }
              showToast(`Level ${nextLvl.id}: ${nextLvl.objectiveText}`);
            }
          }}
          onFreeRoam={() => setLevelCompleteNotice(null)}
        />
      )}

      {/* PAUSE / SETTINGS / ABOUT MODAL */}
      {(screen === 'paused' || activePanel === 'settings' || activePanel === 'about') && (
        <PauseSettingsModal
          mode={
            activePanel === 'settings'
              ? 'settings'
              : activePanel === 'about'
                ? 'about'
                : 'pause'
          }
          settings={settings}
          savedNotice={savedNotice}
          onUpdateSettings={setSettings}
          onResume={() => {
            setActivePanel('none');
            setScreen('playing');
          }}
          onSaveGame={handleSaveGame}
          onOpenSettings={() => setActivePanel('settings')}
          onReturnTitle={() => {
            saveProgressToStorage(progressRef.current);
            void saveProgressToIndexedDb(progressRef.current);
            setActiveDialogue(null);
            setActiveAdBoard(null);
            setActivePanel('none');
            setLevelCompleteNotice(null);
            setEmergencyIncident(null);
            worldRef.current?.cancelEmergencyDispatch();
            setScreen('title');
          }}
          onClose={() => setActivePanel('none')}
        />
      )}
    </main>
  );
}
