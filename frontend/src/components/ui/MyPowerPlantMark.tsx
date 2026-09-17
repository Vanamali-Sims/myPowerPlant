import myPowerPlantIcon from '../../assets/MyPowerPlant_icon.png'

type Props = {
  width?: number
  height?: number
  className?: string
}

/**
 * MyPowerPlantMark
 * @param props.width - Render width in pixels
 * @returns App icon for the Home rail item
 */
export function MyPowerPlantMark({ width = 18, height = 18, className = 'ui-icon-img' }: Props) {
  return (
    <img
      src={myPowerPlantIcon}
      alt=""
      width={width}
      height={height}
      className={className}
      aria-hidden
    />
  )
}
