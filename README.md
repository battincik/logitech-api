# G HUB Battery Tray

Logitech G HUB'ın yerel WebSocket servisini kullanarak pil destekli Logitech G cihazlarını Windows sistem tepsisinde gösterir. Pil seviyelerini ve şarj durumunu görüntüler; %20, %10, %5, %3 ve %0 eşiklerinde bildirim gönderir.

## Çalıştırma

Windows 10/11, çalışan Logitech G HUB, Node.js 20+ ve npm gerekir. Electron kurulumu için Node.js 22 LTS önerilir.

```powershell
npm install
npm run dev
```

Pencere açılmaz; bildirim alanındaki gizli simgelere (`^`) bakın. Bağlantı sorunu varsa `Get-NetTCPConnection -LocalPort 9010 -State Listen` ve Görev Yöneticisi'ndeki `lghub_agent.exe` işlemini kontrol edin. G HUB arayüzü belgelenmemiştir ve yeni sürümlerde değişebilir.

## Kurulum dosyasını bir kez oluşturma

```powershell
npm test
npm run dist
```

`release/G-HUB-Battery-Tray-1.0.0-x64.exe` taşınabilir başlangıç uygulamasıdır. İlk dağıtım için bu dosyayı bir kez kullanıcılara iletmek gerekir; sonraki JavaScript güncellemeleri uygulama içinden gelir. Eski NSIS kurulumundan geçişte bu yeni taşınabilir uygulamayı bir kez indirip açın. Güncellemeler Electron'un kendisini, native modülleri veya taşınabilir exe'yi değiştirmez; bu tür değişiklikler için yeni exe gerekir.

## Commit üzerinden güncelleme

1. `updater-config.json` içindeki `owner`, `repo`, `branch` değerlerini herkese açık deponuza göre düzenleyin; başlangıç değerleri `battincik/logitech-api`, `main`.
2. Kodda değişiklik yaptıktan sonra `npm run build:update` çalıştırın.
3. Kaynak kodla birlikte **`updates/app.cjs` dosyasını da commit ve push edin**. Bu dosya commit'e eklenmezse kullanıcılar değişikliği alamaz. GitHub Actions, Release, sunucu, token ve imza gerekmez.
4. Uygulama açıldıktan 15 saniye sonra, ardından altı saatte bir `updates/app.cjs` dosyasına dokunan son commit'i denetler. Sağ tık menüsünden elle de denetlenebilir.
5. Yeni paket doğrulanıp `%APPDATA%/G HUB Battery Tray/updates/app.cjs` altına indirilir. Menüden **Güncelleme hazır · Yeniden başlat** seçildiğinde yeni kod yüklenir; normal yeniden açılışta da yüklenir. Paket açılışta yüklenemezse uygulama beraberinde gelen temel sürüme döner.

İndirilen dosyanın Git blob SHA değeri GitHub API verisiyle karşılaştırılır. Bu kontrol aktarım hatasını saptar; **yayıncının kimliğini kriptografik olarak doğrulamaz**. Depoya yazma yetkisi olan hesapları koruyun. GitHub API anonim istek sınırı ve erişim kesintileri güncelleme denetimini erteleyebilir; pil takibi çalışmaya devam eder.

`npm test` pil olaylarını ve güncelleme paketinin doğrulanmasını sınar. Derlenen `dist/` dosyaları Git'e eklenmez; `updates/app.cjs` eklenir.
