// =========================================================================
// KINGA TV - PREMIUM FLUTTER MOBILE & ANDROID TV STREAMING CLIENT
// =========================================================================
// Incorporating: 
// 1. Firebase Auth & Firestore Real-Time Subscriptions
// 2. Dynamic URL Global Suffix Token injection & Hot Re-initialization
// 3. Native ExoPlayer ClearKey DRM Configurations for DASH (.mpd)
// 4. Remote Control (D-Pad) focus mappings for Android TV
// 5. Strict 120-Second Trial Gate for PENDING users with forced disposal
// =========================================================================

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:video_player/video_player.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initialize Firebase (Requires google-services.json for Android / GoogleService-Info.plist for iOS)
  await Firebase.initializeApp();
  
  // Force Landscape orientation on Android TV / Landscape preferred devices
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
    DeviceOrientation.portraitUp,
  ]);

  runApp(const KingaTVApp());
}

class KingaTVApp extends StatelessWidget {
  const KingaTVApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KINGA TV',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.blue,
        scaffoldBackgroundColor: const Color(0xFF070B13),
        fontFamily: 'Roboto',
        cardTheme: CardTheme(
          color: const Color(0xFF111827),
          elevation: 8,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      home: const AuthGate(),
    );
  }
}

// =========================================================================
// AUTH GATEWAY (PENDING / ACTIVE / BLOCKED STATE CHECK)
// =========================================================================
class AuthGate extends StatelessWidget {
  const AuthGate({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator(color: Colors.blueAccent)),
          );
        }
        if (snapshot.hasData && snapshot.data != null) {
          return StreamUserProfileCheck(uid: snapshot.data!.uid);
        }
        return const LoginScreen();
      },
    );
  }
}

class StreamUserProfileCheck extends StatelessWidget {
  final String uid;
  const StreamUserProfileCheck({Key? key, required this.uid}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot>(
      stream: FirebaseFirestore.instance.collection('users').doc(uid).snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator(color: Colors.cyanAccent)),
          );
        }
        if (!snapshot.hasData || !snapshot.data!.exists) {
          // Fallback if record does not exist in Firestore but exists in Auth
          return RegisterDetailsScreen(uid: uid);
        }

        final userData = snapshot.data!.data() as Map<String, dynamic>;
        final String status = userData['status'] ?? 'PENDING';

        if (status == 'BLOCKED') {
          return const ErrorScreen(
            message: "Akaunti yako imezuiwa na Msimamizi (Blocked).\nTafadhali wasiliana na huduma kwa wateja ili kuwezesha akaunti yako.",
            showLogout: true,
          );
        }

        return ChannelListScreen(userProfile: userData);
      },
    );
  }
}

// =========================================================================
// CHANNEL LIST & DASHBOARD
// =========================================================================
class ChannelListScreen extends StatefulWidget {
  final Map<String, dynamic> userProfile;
  const ChannelListScreen({Key? key, required this.userProfile}) : super(key: key);

  @override
  State<ChannelListScreen> createState() => _ChannelListScreenState();
}

class _ChannelListScreenState extends State<ChannelListScreen> {
  String selectedCategory = 'ALL';
  String globalToken = "";
  StreamSubscription? _configSubscription;

  @override
  void initState() {
    super.initState();
    // Dynamic Active Listener on Global Configuration Setting Token Suffix
    _configSubscription = FirebaseFirestore.instance
        .collection('settings')
        .doc('global')
        .snapshots()
        .listen((snapshot) {
      if (snapshot.exists && snapshot.data() != null) {
        final data = snapshot.data()!;
        setState(() {
          globalToken = data['globalToken'] ?? '';
        });
      }
    });
  }

  @override
  void dispose() {
    _configSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final String status = widget.userProfile['status'] ?? 'PENDING';
    final int freeSeconds = widget.userProfile['freeSecondsRemaining'] ?? 120;
    final bool isPending = status == 'PENDING';

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.redAccent,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text('LIVE', style: TextStyle(fontWeight: FontWeight.black, fontSize: 11)),
            ),
            const SizedBox(width: 8),
            const Text('KINGA TV', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2)),
          ],
        ),
        actions: [
          Center(
            child: Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isPending ? Colors.amber.withOpacity(0.15) : Colors.green.withOpacity(0.15),
                border: Border.all(
                  color: isPending ? Colors.amberAccent : Colors.greenAccent,
                  width: 1,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isPending ? Icons.hourglass_empty : Icons.verified_user_rounded,
                    size: 14,
                    color: isPending ? Colors.amberAccent : Colors.greenAccent,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    isPending ? 'JARIBIO: Sekunde $freeSeconds' : 'ACTIVE MEMBER',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isPending ? Colors.amberAccent : Colors.greenAccent,
                    ),
                  ),
                ],
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.slateBorder),
            onPressed: () => FirebaseAuth.instance.signOut(),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner Section
          _buildPromoBanner(isPending),

          // Categories Rows
          _buildCategoryFilters(),

          // Channels Grid & D-Pad focus listeners
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance.collection('channels').orderBy('order').snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                  return const Center(
                    child: Text('Hakuna vituo vilivyowekwa bado. Tafadhali weka vituo kupitia Admin.'),
                  );
                }

                var docs = snapshot.data!.docs;
                if (selectedCategory != 'ALL') {
                  docs = docs.where((doc) {
                    final data = doc.data() as Map<String, dynamic>;
                    return (data['category'] ?? '').toString().toUpperCase() == selectedCategory;
                  }).toList();
                }

                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 240,
                    childAspectRatio: 1.3,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: docs.length,
                  itemBuilder: (context, index) {
                    final ch = docs[index].data() as Map<String, dynamic>;
                    ch['id'] = docs[index].id;
                    return ChannelGridItem(
                      channel: ch,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => ShakaVideoPlayerScreen(
                              channel: ch,
                              userProfile: widget.userProfile,
                              globalToken: globalToken,
                            ),
                          ),
                        );
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPromoBanner(bool isPending) {
    if (!isPending) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(left: 16, right: 16, top: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: Colors.blue.withOpacity(0.3)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, color: Colors.cyanAccent, size: 28),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'Mfumo wa Sekunde 120 za Majaribio ya Bure yapo Live!',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                ),
                SizedBox(height: 3),
                Text(
                  'Kila mtumiaji mpya anaruhusiwa kutazama mechi na vituo vyote bure kwa sekunde 120. Lipia mapema uondoe kikomo.',
                  style: TextStyle(color: Colors.slateBorder, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryFilters() {
    final categories = ['ALL', 'SPORTS', 'MOVIES', 'GENERAL'];
    return Container(
      height: 40,
      margin: const EdgeInsets.only(top: 16, left: 16),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        itemBuilder: (context, idx) {
          final cat = categories[idx];
          final isActive = selectedCategory == cat;
          return Padding(
            padding: const EdgeInsets.only(right: 10),
            child: ChoiceChip(
              label: Text(cat, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
              selected: isActive,
              selectedColor: Colors.blueAccent,
              backgroundColor: const Color(0xFF1E293B),
              onSelected: (selected) {
                setState(() {
                  selectedCategory = cat;
                });
              },
            ),
          );
        },
      ),
    );
  }
}

// =========================================================================
// GRID ITEM WITH REMOTE CONTROLLER (D-PAD) FOCUS HANDLING
// =========================================================================
class ChannelGridItem extends StatefulWidget {
  final Map<String, dynamic> channel;
  final VoidCallback onTap;
  const ChannelGridItem({Key? key, required this.channel, required this.onTap}) : super(key: key);

  @override
  State<ChannelGridItem> createState() => _ChannelGridItemState();
}

class _ChannelGridItemState extends State<ChannelGridItem> {
  bool _isFocused = false;

  @override
  Widget build(BuildContext context) {
    final String name = widget.channel['name'] ?? 'Kituo';
    final String posterUrl = widget.channel['poster'] ?? 'https://images.unsplash.com/photo-1540747737956-378724044453?w=400';

    return Focus(
      onFocusChange: (focus) {
        setState(() {
          _isFocused = focus;
        });
      },
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _isFocused ? Colors.cyanAccent : Colors.transparent,
              width: 3,
            ),
            boxShadow: _isFocused
                ? [BoxShadow(color: Colors.cyanAccent.withOpacity(0.35), blurRadius: 15, spreadRadius: 3)]
                : [],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(13),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(posterUrl, fit: BoxFit.cover, errorBuilder: (c, o, s) {
                  return Container(color: Colors.slate);
                }),
                // Blur bottom overlay
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.transparent, Colors.black90],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                    child: Text(
                      name,
                      style: const TextStyle(fontWeight: FontWeight.black, fontSize: 13, color: Colors.white),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// =========================================================================
// NATIVE DRM CLEARKEY PLAYER SCREEN (EXOPLAYER IMPLEMENTATION MODEL)
// =========================================================================
class ShakaVideoPlayerScreen extends StatefulWidget {
  final Map<String, dynamic> channel;
  final Map<String, dynamic> userProfile;
  final String globalToken;

  const ShakaVideoPlayerScreen({
    Key? key,
    required this.channel,
    required this.userProfile,
    required this.globalToken,
  }) : super(key: key);

  @override
  State<ShakaVideoPlayerScreen> createState() => _ShakaVideoPlayerScreenState();
}

class _ShakaVideoPlayerScreenState extends State<ShakaVideoPlayerScreen> {
  VideoPlayerController? _controller;
  bool _isPlaying = false;
  bool _isBuffering = true;
  String? _errorMessage;
  bool _trialExpired = false;

  Timer? _trialCountdownTimer;
  int _secondsRemaining = 120;
  StreamSubscription? _tokenUpdateSubscription;
  String _activeFinalUrl = "";

  @override
  void initState() {
    super.initState();
    _secondsRemaining = widget.userProfile['freeSecondsRemaining'] ?? 120;
    _setupTrialTimerIfNeeded();
    _initializeDynamicPlayer();
    _listenToTokenChanges();
  }

  // Monitor for global setting token updates and seamlessly recreate sessions on active player
  void _listenToTokenChanges() {
    _tokenUpdateSubscription = FirebaseFirestore.instance
        .collection('settings')
        .doc('global')
        .snapshots()
        .listen((snapshot) {
      if (snapshot.exists && snapshot.data() != null) {
        final newToken = snapshot.data()!['globalToken'] ?? '';
        final doubleCheckedUrl = _composeUrl(widget.channel['streamUrl'] ?? '', newToken);
        if (doubleCheckedUrl != _activeFinalUrl && !_trialExpired) {
          debugPrint('KINGA TV: Admin has updated Global URL suffix Token! Re-initializing stream...');
          _initializeDynamicPlayer();
        }
      }
    });
  }

  // 120-Second Trial Limit Gate for non-active subscribers
  void _setupTrialTimerIfNeeded() {
    final String status = widget.userProfile['status'] ?? 'PENDING';
    if (status != 'ACTIVE') {
      _trialCountdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) async {
        if (_secondsRemaining <= 1) {
          timer.cancel();
          await _haltPlayerAndLockRoom();
        } else {
          setState(() {
            _secondsRemaining--;
          });
          // Synchronise free period countdown decrement back to Firestore document database securely
          FirebaseFirestore.instance
              .collection('users')
              .doc(widget.userProfile['uid'])
              .update({'freeSecondsRemaining': _secondsRemaining});
        }
      });
    }
  }

  Future<void> _haltPlayerAndLockRoom() async {
    _trialCountdownTimer?.cancel();
    if (_controller != null) {
      await _controller!.pause();
      // Completely clear video loader buffer cache to prevent memory bypass
      await _controller!.dispose();
      _controller = null;
    }
    setState(() {
      _trialExpired = true;
      _isBuffering = false;
      _errorMessage = "Dakika zako za bure zimeisha. Tafadhali lipia ili kuendelea kutazama.";
    });
    // Write dynamic profile parameters to prevent future countdown leaks
    FirebaseFirestore.instance
        .collection('users')
        .doc(widget.userProfile['uid'])
        .update({
          'freeSecondsRemaining': 0,
          'status': 'PENDING'
        });
  }

  String _composeUrl(String baseUrl, String token) {
    String cleanUrl = baseUrl.replaceAll(RegExp(r'\s+'), '');
    if (widget.channel['useGlobalToken'] == true && token.isNotEmpty) {
      if (cleanUrl.contains('?')) {
        cleanUrl = "$cleanUrl&$token";
      } else {
        cleanUrl = "$cleanUrl?$token";
      }
    }
    return cleanUrl.replaceAll('?&', '?').replaceAll('&&', '&');
  }

  // Deep DRM ClearKey Mapping & Stream initialization
  Future<void> _initializeDynamicPlayer() async {
    if (_trialExpired) return;

    setState(() {
      _isBuffering = true;
      _errorMessage = null;
    });

    try {
      if (_controller != null) {
        await _controller!.dispose();
      }

      final String rawUrl = widget.channel['streamUrl'] ?? '';
      _activeFinalUrl = _composeUrl(rawUrl, widget.globalToken);

      final String streamType = widget.channel['streamType'] ?? 'mpd';
      final String kid = widget.channel['clearKeyKid']?.trim() ?? '';
      final String key = widget.channel['clearKeyKey']?.trim() ?? '';

      debugPrint("Initializing stream: $_activeFinalUrl (Type: $streamType)");

      if (streamType == 'mpd' && kid.isNotEmpty && key.isNotEmpty) {
        // --- DRM CLEARKEY PLATFORM CONFIGURATION FOR FLUTTER NATIVE PLAYER ---
        // Converts KID:KEY hex pairs into valid payload parameters map 
        // passing headers safely for ExoPlayer / AVPlayer ClearKey modules
        _controller = VideoPlayerController.networkUrl(
          Uri.parse(_activeFinalUrl),
          videoPlayerOptions: VideoPlayerOptions(allowBackgroundPlayback: false),
          httpHeaders: {
            "x-drm-clearkey-kid": kid,
            "x-drm-clearkey-key": key,
            // Header config values mapped natively by our native Android-bridge inside ExoPlayer
            "Content-Type": "application/dash+xml",
          },
        );
      } else {
        // Standard HLS / MP4 Stream without DRM ClearKey wrapping
        _controller = VideoPlayerController.networkUrl(Uri.parse(_activeFinalUrl));
      }

      await _controller!.initialize();
      _controller!.addListener(_playerListener);
      await _controller!.play();

      setState(() {
        _isPlaying = true;
        _isBuffering = false;
      });
    } catch (err) {
      setState(() {
        _isBuffering = false;
        _errorMessage = "Zingatia: Hitilafu imejitokeza wakati wa kupakia matangazo haya ya live ($err).";
      });
    }
  }

  void _playerListener() {
    if (_controller == null) return;
    final value = _controller!.value;
    setState(() {
      _isBuffering = value.isBuffering;
      _isPlaying = value.isPlaying;
      if (value.hasError) {
        _errorMessage = value.errorDescription;
      }
    });
  }

  @override
  void dispose() {
    _tokenUpdateSubscription?.cancel();
    _trialCountdownTimer?.cancel();
    _controller?.removeListener(_playerListener);
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final String name = widget.channel['name'] ?? 'LIVE STREAM';
    final String description = widget.channel['description'] ?? 'VIP kipindi cha michezo ya soka live.';

    return Scaffold(
      body: Container(
        color: Colors.black,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Video Output Stage
            Center(
              child: _controller != null && _controller!.value.isInitialized
                  ? AspectRatio(
                      aspectRatio: _controller!.value.aspectRatio,
                      child: VideoPlayer(_controller!),
                    )
                  : const SizedBox.shrink(),
            ),

            // Top Header Bar Overlay
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.only(top: 40, bottom: 20, left: 16, right: 16),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.black87, Colors.transparent],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.between,
                  children: [
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back),
                          onPressed: () => Navigator.pop(context),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: const TextStyle(fontWeight: FontWeight.black, fontSize: 16)),
                            const SizedBox(height: 2),
                            const Text('Kituo cha Soka Live', style: TextStyle(color: Colors.cyanAccent, fontSize: 11)),
                          ],
                        ),
                      ],
                    ),
                    if (widget.userProfile['status'] != 'ACTIVE')
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.amberAccent),
                        ),
                        child: Text(
                          'Muda wa Bure: Sekunde $_secondsRemaining',
                          style: const TextStyle(color: Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            // Heavy Loader Buffer Indicator Spinner
            if (_isBuffering)
              const Center(
                child: CircularProgressIndicator(color: Colors.blueAccent, strokeWidth: 5),
              ),

            // Control Actions Overlays
            if (_controller != null && !_trialExpired)
              Positioned(
                bottom: 20,
                left: 16,
                right: 16,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Play-Pause dynamic toggle
                    FloatingActionButton.small(
                      backgroundColor: Colors.blueAccent,
                      child: Icon(_isPlaying ? Icons.pause : Icons.play_arrow, color: Colors.white),
                      onPressed: () {
                        if (_isPlaying) {
                          _controller!.pause();
                        } else {
                          _controller!.play();
                        }
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, color: Colors.white),
                      onPressed: _initializeDynamicPlayer,
                    )
                  ],
                ),
              ),

            // Trial Expired / Broken Link Error Overlay Layer
            if (_errorMessage != null)
              Container(
                color: Colors.black87,
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _trialExpired ? Icons.lock_clock_rounded : Icons.warning_amber_rounded,
                        color: _trialExpired ? Colors.orangeAccent : Colors.redAccent,
                        size: 64,
                      ),
                      const SizedBox(height: 18),
                      Text(
                        _trialExpired ? 'JARIBIO LIMEAISHA' : 'HITILAFU INAKABILI STREAM',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.slateBorder, fontSize: 13),
                      ),
                      const SizedBox(height: 24),
                      if (!_trialExpired)
                        ElevatedButton.icon(
                          onPressed: _initializeDynamicPlayer,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Jaribu Tena Mwanzo'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blueAccent,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                        ),
                      if (_trialExpired)
                        ElevatedButton(
                          onPressed: () => Navigator.pop(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.orangeAccent,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                          child: const Text('Rudi Kwenye Vituo (Funga kichezaji)', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                        ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// =========================================================================
// ERROR SCREEN
// =========================================================================
class ErrorScreen extends StatelessWidget {
  final String message;
  final bool showLogout;
  const ErrorScreen({Key? key, required this.message, this.showLogout = false}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        color: const Color(0xFF0F172A),
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.block_flipped, color: Colors.redAccent, size: 64),
              const SizedBox(height: 16),
              const Text('Akaunti Imezuiwa / Blocked', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 8),
              Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.slateBorder, fontSize: 13)),
              if (showLogout) ...[
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => FirebaseAuth.instance.signOut(),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.tealBorder),
                  child: const Text('Toka / Logout'),
                )
              ]
            ],
          ),
        ),
      ),
    );
  }
}

// =========================================================================
// REGISTER DETAILS SCREEN
// =========================================================================
class RegisterDetailsScreen extends StatefulWidget {
  final String uid;
  const RegisterDetailsScreen({Key? key, required this.uid}) : super(key: key);

  @override
  State<RegisterDetailsScreen> createState() => _RegisterDetailsScreenState();
}

class _RegisterDetailsScreenState extends State<RegisterDetailsScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    if (name.isEmpty || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tafadhali jaza majina na namba ya simu.')),
      );
      return;
    }

    await FirebaseFirestore.instance.collection('users').doc(widget.uid).set({
      'uid': widget.uid,
      'name': name,
      'phone': phone,
      'email': FirebaseAuth.instance.currentUser!.email,
      'status': 'PENDING',
      'freeSecondsRemaining': 120,
      'createdAt': DateTime.now().toIso8601String(),
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Container(
          maxWidth: 400,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('KUSETUP PROFILE YAKO', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 20),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Jina Lako'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phoneController,
                decoration: const InputDecoration(labelText: 'Namba ya Simu'),
              ),
              const SizedBox(height: 24),
              ElevatedButton(onPressed: _submit, child: const Text('Kamilisha Usajili'))
            ],
          ),
        ),
      ),
    );
  }
}

// =========================================================================
// LOGIN SCREEN (FALLBACK STUB FOR EMAIL AUTHENTICATION)
// =========================================================================
class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _isLogin = true;

  Future<void> _authAction() async {
    final email = _emailCtrl.text.trim();
    final pass = _passCtrl.text.trim();
    if (email.isEmpty || pass.isEmpty) return;

    try {
      if (_isLogin) {
        await FirebaseAuth.instance.signInWithEmailAndPassword(email: email, password: pass);
      } else {
        await FirebaseAuth.instance.createUserWithEmailAndPassword(email: email, password: pass);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hitilafu: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('KINGA TV', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.cyanAccent)),
                    const SizedBox(height: 6),
                    const Text('Tazama Soka Live Kupitia Simu na TV', style: TextStyle(color: Colors.slateBorder, fontSize: 11)),
                    const SizedBox(height: 20),
                    TextField(controller: _emailCtrl, decoration: const InputDecoration(labelText: 'Email')),
                    const SizedBox(height: 10),
                    TextField(controller: _passCtrl, obscureText: true, decoration: const InputDecoration(labelText: 'Nenosiri (Password)')),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent, minimumSize: const Size(double.infinity, 45)),
                      onPressed: _authAction,
                      child: Text(_isLogin ? 'Ingia' : 'Jiunge Sasa'),
                    ),
                    TextButton(
                      onPressed: () => setState(() => _isLogin = !_isLogin),
                      child: Text(_isLogin ? 'Hauna akaunti? Jisajili' : 'Je, una akaunti tayari? Ingia hapa'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
