using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

/// <summary>
/// Removes a connected white background from a cartoon JPG and crops to the
/// subject, producing a transparent PNG. Connectivity-based so pale interior
/// fills (the cat's white belly) are preserved; only the region reachable from
/// the border is keyed out.
/// </summary>
public static class CatKeyer
{
    private sealed class Work
    {
        public int W;
        public int H;
        public int Stride;
        public int Tol;
        public byte[] Px;
        public bool[] Bg;
        public Queue<int> Q = new Queue<int>();

        public void Push(int x, int y)
        {
            if (x < 0 || y < 0 || x >= W || y >= H) return;
            int i = y * W + x;
            if (Bg[i]) return;
            int o = y * Stride + x * 4;
            int b = Px[o];
            int g = Px[o + 1];
            int r = Px[o + 2];
            int min = Math.Min(r, Math.Min(g, b));
            if (min < Tol) return;
            Bg[i] = true;
            Q.Enqueue(i);
        }
    }

    /// <summary>Returns "WxH" of the cropped result, or "EMPTY".</summary>
    public static string Run(string inPath, string outPath, int whiteTol)
    {
        using (var src = new Bitmap(inPath))
        using (var bmp = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb))
        {
            using (var g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.Transparent);
                g.DrawImageUnscaled(src, 0, 0);
            }

            int w = bmp.Width;
            int h = bmp.Height;
            var rect = new Rectangle(0, 0, w, h);
            var data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);

            var work = new Work();
            work.W = w;
            work.H = h;
            work.Stride = data.Stride;
            work.Tol = whiteTol;
            work.Px = new byte[data.Stride * h];
            work.Bg = new bool[w * h];
            Marshal.Copy(data.Scan0, work.Px, 0, work.Px.Length);

            for (int x = 0; x < w; x++)
            {
                work.Push(x, 0);
                work.Push(x, h - 1);
            }
            for (int y = 0; y < h; y++)
            {
                work.Push(0, y);
                work.Push(w - 1, y);
            }
            while (work.Q.Count > 0)
            {
                int i = work.Q.Dequeue();
                int x = i % w;
                int y = i / w;
                work.Push(x - 1, y);
                work.Push(x + 1, y);
                work.Push(x, y - 1);
                work.Push(x, y + 1);
            }

            byte[] px = work.Px;
            bool[] bg = work.Bg;
            int stride = work.Stride;

            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    int i = y * w + x;
                    int o = y * stride + x * 4;
                    if (bg[i])
                    {
                        px[o + 3] = 0;
                        continue;
                    }
                    bool edge =
                        (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) ||
                        (y > 0 && bg[i - w]) || (y < h - 1 && bg[i + w]);
                    if (!edge) continue;
                    int b = px[o];
                    int g = px[o + 1];
                    int r = px[o + 2];
                    int min = Math.Min(r, Math.Min(g, b));
                    int alpha = (255 - min) * 4;
                    if (alpha < 0) alpha = 0;
                    if (alpha > 255) alpha = 255;
                    if (alpha < px[o + 3]) px[o + 3] = (byte)alpha;
                }
            }

            int minX = w, minY = h, maxX = -1, maxY = -1;
            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    if (px[y * stride + x * 4 + 3] > 8)
                    {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            if (maxX < 0)
            {
                bmp.UnlockBits(data);
                return "EMPTY";
            }

            int pad = 2;
            minX = Math.Max(0, minX - pad);
            minY = Math.Max(0, minY - pad);
            maxX = Math.Min(w - 1, maxX + pad);
            maxY = Math.Min(h - 1, maxY + pad);
            int cw = maxX - minX + 1;
            int ch = maxY - minY + 1;

            bmp.UnlockBits(data);

            using (var cropped = new Bitmap(cw, ch, PixelFormat.Format32bppArgb))
            {
                var cd = cropped.LockBits(new Rectangle(0, 0, cw, ch), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                var cb = new byte[cd.Stride * ch];
                for (int y = 0; y < ch; y++)
                {
                    Array.Copy(px, (y + minY) * stride + minX * 4, cb, y * cd.Stride, cw * 4);
                }
                Marshal.Copy(cb, 0, cd.Scan0, cb.Length);
                cropped.UnlockBits(cd);
                cropped.Save(outPath, ImageFormat.Png);
            }

            return cw + "x" + ch;
        }
    }
}
