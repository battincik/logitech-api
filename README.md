# G HUB Battery Tray

Logitech G HUB'ın yerel WebSocket servisini kullanarak pil destekli Logitech G cihazlarını Windows sistem tepsisinde gösteren küçük bir Electron uygulamasıdır.

## Özellikler

- Fare, klavye ve kulaklık pil yüzdesini sistem tepsisinde gösterir.
- Birden fazla cihazı sağ tık menüsünde listeler.
- G HUB kapanırsa otomatik yeniden bağlanır.
- Her 60 saniyede bir yedek yenileme yapar; canlı pil olaylarını da dinler.
- Aynı eşik için tekrar tekrar bildirim göndermez.
- Durumu diske kaydeder; uygulama yeniden başladığında gereksiz bildirim üretmez.

Bildirimler:

- Şarja takıldığında
- Tamamen şarj olduğunda
- Pil %20, %10, %5 ve %3 eşiklerine düştüğünde
- Pil %0 olduğunda

## Gereksinimler

- Windows 10 veya Windows 11
- Node.js 20 veya üzeri
- npm
- Logitech G HUB'ın kurulu ve çalışıyor olması

G HUB'ın `lghub_agent.exe` işlemi normalde `127.0.0.1:9010` adresinde çalışır.

## Geliştirme

```powershell
npm install
npm run dev
```

Uygulama pencere açmaz. Windows bildirim alanındaki gizli simgeler (`^`) bölümüne bakın.

Testler:

```powershell
npm test
```

## Windows kurulum dosyası

```powershell
npm run dist
```

Kurulum dosyası `release` klasöründe oluşur.

## Sorun giderme

G HUB bağlantısı kurulamıyorsa PowerShell'de kontrol edin:

```powershell
Get-NetTCPConnection -LocalPort 9010 -State Listen
```

Sonuç yoksa G HUB'ı kapatıp yeniden açın. Görev Yöneticisi'nde `lghub_agent.exe` işleminin çalıştığını doğrulayın.

Bildirimleri denemek için tepsi simgesine sağ tıklayıp **Bildirim testi** seçeneğini kullanın. Bildirim görünmüyorsa Windows **Ayarlar > Sistem > Bildirimler** altında G HUB Battery Tray bildirimlerinin açık ve Rahatsız Etmeyin modunun kapalı olduğunu kontrol edin.

Bu uygulama G HUB'ın belgelenmemiş yerel arayüzünü kullanır. Gelecekteki bir G HUB güncellemesi protokolü değiştirirse istemcinin güncellenmesi gerekebilir.
