# The third_party directory

This directory is where the EDSDK files go. You will have to make an account
and download them from the [Canon Developer Community](https://developercommunity.usa.canon.com/s/).

## Versioning

If you're using a different version of the EDSDK, replace the version number
(in this case `131520`) with your version number (such as `131710`.)
**Make sure to update the version number in [binding.gyp](../binding.gyp) as well!**

## Platform-specific instructions

### Windows

Simply extract the EDSDK `.zip` archive to `EDSDKv131520W/Windows/`.

### MacOS:

-   Extract the EDSDK `.zip` archive to a temporary location.
-   Extract the inner `Macintosh.dmg.zip` to another temporary location.
-   Double-click `Macintosh.dmg` to mount it.
-   From the mounted `Macintosh` volume, copy the `EDSDK` folder into `EDSDKv131520M/macos`.

## Bug fix

The current EDSDK versions have a bug in `EDSDKTypes.h`. The keys are missing
their prefixes. This will result in a conflict at compile time.
You will need to fix the `EdsObjectFormat` enum. (Approximate line #: 870)

```cpp
/*-----------------------------------------------------------------------------
ObjectFormat Code
-----------------------------------------------------------------------------*/
typedef enum
{
    kEdsObjectFormat_Unknown   = 0x00000000,
    kEdsObjectFormat_Jpeg      = 0x3801,
    kEdsObjectFormat_CR2       = 0xB103,
    kEdsObjectFormat_MP4       = 0xB982,
    kEdsObjectFormat_CR3       = 0xB108,
    kEdsObjectFormat_HEIF_CODE = 0xB10B,
} EdsObjectFormat;
```
