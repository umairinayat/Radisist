import torch
import torch.nn as nn
import torch.nn.functional as F
import segmentation_models_pytorch as smp

class ChannelAttention(nn.Module):
    def __init__(self, channels, reduction=16):
        super().__init__()
        mid = max(channels // reduction, 8)
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
        self.fc = nn.Sequential(
            nn.Conv2d(channels, mid, 1, bias=False),
            nn.ReLU(inplace=True),
            nn.Conv2d(mid, channels, 1, bias=False),
        )
        self.sigmoid = nn.Sigmoid()
    def forward(self, x):
        avg = self.fc(self.avg_pool(x))
        mx = self.fc(self.max_pool(x))
        return self.sigmoid(avg + mx) * x

class SpatialAttention(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Conv2d(2, 1, 7, padding=3, bias=False)
        self.sigmoid = nn.Sigmoid()
    def forward(self, x):
        avg = torch.mean(x, dim=1, keepdim=True)
        mx, _ = torch.max(x, dim=1, keepdim=True)
        cat = torch.cat([avg, mx], dim=1)
        att = self.sigmoid(self.conv(cat))
        return att * x

class ScaleAttention(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.branch1 = nn.Conv2d(channels, channels, 3, padding=1, dilation=1, bias=False)
        self.branch2 = nn.Conv2d(channels, channels, 3, padding=2, dilation=2, bias=False)
        self.branch3 = nn.Conv2d(channels, channels, 3, padding=4, dilation=4, bias=False)
        self.fuse = nn.Conv2d(channels * 3, channels, 1, bias=False)
        self.bn = nn.BatchNorm2d(channels)
        self.sigmoid = nn.Sigmoid()
    def forward(self, x):
        b1 = self.branch1(x)
        b2 = self.branch2(x)
        b3 = self.branch3(x)
        fused = self.fuse(torch.cat([b1, b2, b3], dim=1))
        fused = self.bn(fused)
        return self.sigmoid(fused) * x + x

class TripleAttentionBlock(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.ca = ChannelAttention(channels)
        self.sa = SpatialAttention()
        self.sc = ScaleAttention(channels)
    def forward(self, x):
        x = self.ca(x)
        x = self.sa(x)
        x = self.sc(x)
        return x

class TANet(nn.Module):
    def __init__(self, encoder_name="resnet34", in_channels=3, classes=1):
        super().__init__()
        self.arch = "tanet"
        self.encoder_name = encoder_name
        self.backbone = smp.UnetPlusPlus(
            encoder_name=encoder_name,
            encoder_weights=None,
            in_channels=in_channels,
            classes=classes,
        )
        enc_channels = self.backbone.encoder.out_channels[1:]
        self.tabs = nn.ModuleList([TripleAttentionBlock(c) for c in enc_channels])
    def forward(self, x):
        features = self.backbone.encoder(x)
        feats = list(features)
        for i, tab in enumerate(self.tabs):
            idx = i + 1
            if idx < len(feats):
                feats[idx] = tab(feats[idx])
        decoder_out = self.backbone.decoder(feats)
        masks = self.backbone.segmentation_head(decoder_out)
        return masks

def build_tanet(encoder_name="resnet34", in_channels=3, classes=1):
    return TANet(encoder_name=encoder_name, in_channels=in_channels, classes=classes)
